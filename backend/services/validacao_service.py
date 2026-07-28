def validar_cpf(cpf: str) -> bool:
    cpf = "".join(filter(str.isdigit, cpf))
    if len(cpf) != 11 or len(set(cpf)) == 1:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    if resto != int(cpf[9]):
        return False

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    return resto == int(cpf[10])


def validar_cnpj(cnpj: str) -> bool:
    cnpj = "".join(filter(str.isdigit, cnpj))
    if len(cnpj) != 14 or len(set(cnpj)) == 1:
        return False

    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * pesos1[i] for i in range(12))
    resto = soma % 11
    dig1 = 0 if resto < 2 else 11 - resto

    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * pesos2[i] for i in range(13))
    resto = soma % 11
    dig2 = 0 if resto < 2 else 11 - resto

    return int(cnpj[12]) == dig1 and int(cnpj[13]) == dig2
