const fixEncoding = (text) => {
    try {
        return decodeURIComponent(escape(text));
    } catch (e) {
        return text;
    }
}

const text1 = "O lead Karine Gomes [P9] acabou de chegar para vocÃª Henrique ! - Capital dispon\xC3\xADvel para investimento: Tenho menos de R$ 195 mil - Profiss\xC3\xA3o: - Cidade/UF: - - Experi\xC3\xAAncia em gest\xC3\xA3o de neg\xC3\xB3cios \xC3\xA9: - Tempo que pretende abrir a unidade: - Disse que quer ser franqueado(a) porque: Obs: Algumas informa\xC3\xA7\xC3\xB5es podem n\xC3\xA3o estar dispon\xC3\xADveis caso o lead tenha preenchido apenas a primeira etapa do formul\xC3\xA1rio. *Esta mensagem foi criada automaticamente atrav\xC3\xA9s da estrat\xC3\xA9gia de RD Station da p9.digital.";
console.log(fixEncoding(text1));

const text2 = "Texto normal com acentuação";
console.log(fixEncoding(text2));
