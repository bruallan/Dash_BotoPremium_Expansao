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
        page.goto("https://botopremium.sults.com.br/pessoa/grid/0/1")

        # ==========================================
        # 4. Loop de Paginação e Extração
        # ==========================================
        tem_proxima_pagina = True

        while tem_proxima_pagina:
            page.wait_for_load_state('networkidle')
            time.sleep(5)
            
            try:
                # Vamos tentar ver o HTML dos primeiros itens da lista para entender a estrutura
                print("HTML Structure da página atual:")
                html_cards = page.evaluate("""
                    () => {
                        // Tenta encontrar elementos de lista ou grid
                        let items = document.querySelectorAll('.ui-dataview-row, .ui-datagrid-row, .ui-card, li, .card');
                        if (items.length > 0) return items[0].outerHTML + '\\n' + (items[1] ? items[1].outerHTML : '');
                        return document.body.innerHTML.substring(0, 3000);
                    }
                """)
                print(html_cards)
            except Exception as e:
                print("Erro ao extrair HTML:", e)
                break
                
            try:
                page.wait_for_selector("table", timeout=5000)
            except Exception as e:
                print(f"Erro ao aguardar tabela: {e}")
                break

            time.sleep(3) # Uma pausa de 3 segundos para garantir que a tabela carregou completamente
            
            linhas = page.query_selector_all("table tbody tr")
            print(f"Lendo {len(linhas)} linhas na tabela da página atual...")
            
            for linha in linhas:
                colunas = linha.query_selector_all("td")
                if len(colunas) >= 4:
                    # Capturando os dados conforme a ordem da sua imagem
                    nome = colunas[0].inner_text().strip()
                    celular = colunas[1].inner_text().strip()
                    email = colunas[2].inner_text().strip()
                    cargo = colunas[3].inner_text().strip()
                    
                    print(f"Lido: {nome} | {email} | {cargo}")

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
                        print(f"Atualizado: {nome}")
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
                        print(f"Novo colaborador criado: {nome}")

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