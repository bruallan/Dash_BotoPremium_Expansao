import os
import time
import uuid
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env (caso executado localmente)
load_dotenv()

# ==========================================
# 1. Configurações Iniciais e Credenciais
# ==========================================
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
sults_user: str = os.environ.get("SULTS_USER")
sults_pass: str = os.environ.get("SULTS_PASS")

supabase: Client = create_client(url, key)

def main():
    print("Iniciando rotina de sincronização...")

    # ==========================================
    # 2. Mapeamento do Banco de Dados Atual
    # ==========================================
    print("Consultando base atual de colaboradores no Supabase...")
    response = supabase.table("colaboradores").select("id, email, status").execute()
    
    usuarios_banco = {
        linha["email"]: {"id": linha["id"], "status": linha.get("status", "")} 
        for linha in response.data
    }
    
    emails_encontrados_no_portal = set()

    # ==========================================
    # 3. Navegação Web (Playwright)
    # ==========================================
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Acessando o portal...")
        page.goto("https://botopremium.sults.com.br/")
        
        # Preenchendo os campos com os IDs exatos que você mapeou!
        page.fill("input[id='form:login-usuario-inputText']", sults_user) 
        page.fill("input[id='form:login-user-password']", sults_pass)   
        
        # Truque: Simulando a tecla "Enter" no campo de senha para fazer login
        try:
            with page.expect_navigation(timeout=30000):
                page.press("input[id='form:login-user-password']", "Enter")
        except Exception as e:
            print(f"Aviso ao aguardar navegação pós-login: {e}")
            print(f"URL atual: {page.url}")
            try:
                print("Texto da tela atual:")
                print(page.evaluate("document.body.innerText")[:1500])
            except:
                pass
        
        print("Acessando grid de pessoas...")
        try:
            page.goto("https://botopremium.sults.com.br/pessoa/grid/0/1", wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            print(f"Erro no goto grid: {e}")

        # ==========================================
        # 4. Loop de Paginação e Extração
        # ==========================================
        tem_proxima_pagina = True

        while tem_proxima_pagina:
            page.wait_for_load_state('networkidle')
            time.sleep(5)
            
            try:
                # Vamos tentar ver o HTML dos primeiros itens da lista para entender a estrutura
            try:
                page.wait_for_selector(".pessoa-grid-item", timeout=15000)
            except Exception as e:
                print(f"Erro ao aguardar grid de pessoas: {e}")
                break

            time.sleep(2) # Uma pequena pausa para garantir que os itens foram carregados
            
            linhas = page.query_selector_all(".pessoa-grid-item")
            print(f"Lendo {len(linhas)} pessoas na página atual...")
            
            for item in linhas:
                try:
                    # Nome
                    nome_el = item.query_selector("h3")
                    nome = nome_el.inner_text().strip() if nome_el else "Desconhecido"
                    
                    # Email
                    email_parent = item.query_selector("i.fa-envelope-o")
                    email = ""
                    if email_parent:
                        email = email_parent.evaluate("el => el.parentElement.innerText").strip()
                        
                    # Celular
                    celular_parent = item.query_selector("i.fa-phone")
                    celular = ""
                    if celular_parent:
                        celular = celular_parent.evaluate("el => el.parentElement.innerText").strip()
                        
                    # Cargo
                    cargo_els = item.query_selector_all(".line-clamp-1")
                    cargo = " / ".join([c.inner_text().strip() for c in cargo_els]) if cargo_els else ""
                    
                    print(f"Lido: {nome} | {email} | {cargo} | {celular}")
                    
                    # O email será nossa chave primária, não podemos inserir sem ele
                    if not email or "@" not in email:
                        print(f"Ignorando {nome} - Sem email válido ({email})")
                        continue

                    emails_encontrados_no_portal.add(email)

                    # ==========================================
                    # 5. Lógica Inteligente de Inserir ou Atualizar
                    # ==========================================
                    if email in usuarios_banco:
                        id_existente = usuarios_banco[email]["id"]
                        dados_atualizacao = {
                            "nome_colaborador": nome,
                            "celular": celular,
                            "cargo": cargo, 
                            "status": "ativo"
                        }
                        supabase.table("colaboradores").update(dados_atualizacao).eq("id", id_existente).execute()
                    else:
                        novo_id = str(uuid.uuid4())
                        dados_insercao = {
                            "id": novo_id,
                            "nome_colaborador": nome,
                            "celular": celular,
                            "email": email,
                            "cargo": cargo, 
                            "status": "ativo"
                        }
                        supabase.table("colaboradores").insert(dados_insercao).execute()
                        
                        usuarios_banco[email] = {"id": novo_id, "status": "ativo"}
                        
                except Exception as e:
                    print(f"Erro ao processar item: {e}")

            print("Página lida com sucesso.")

            # ==========================================
            # 6. Passar a Página (Usando as suas descobertas)
            # ==========================================
            botao_proximo = page.query_selector("a.ui-paginator-next")
            
            if botao_proximo:
                classes_do_botao = botao_proximo.get_attribute("class")
                # Verifica se o botão "Próximo" ESTÁ desativado (última página)
                if "ui-state-disabled" not in classes_do_botao:
                    botao_proximo.click()
                else:
                    tem_proxima_pagina = False # Chegamos na última, encerra o loop
            else:
                tem_proxima_pagina = False 

        browser.close()

    # ==========================================
    # 7. Atualizar status para Inativo
    # ==========================================
    print("Verificando colaboradores inativos...")
    for email, info in usuarios_banco.items():
        if info["status"] == "ativo" and email not in emails_encontrados_no_portal:
            supabase.table("colaboradores").update({"status": "inativo"}).eq("id", info["id"]).execute()
            print(f"Colaborador inativado: {email}")

    print("Rotina finalizada com sucesso!")

if __name__ == "__main__":
    main()