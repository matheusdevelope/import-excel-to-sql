import fs from "fs";

function aspas(value: string | number | boolean) {
  return `'` + value + `'`;
}
function StringApenasNumero(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function GenerateInsert(LISTA: IValuesToInsert[], IDs: IIds) {
  function AppendFile(data: string) {
    fs.appendFileSync(IDs.output_file, data);
  }
  const Inserts: string[] = [];

  // AppendFile(`USE ${IDs.BaseDeDados} \n GO \n\n `);

  LISTA.forEach((obj) => {
    let ValorComum: {
      [key: string]: string | number | null;
    } = {
      ID: "Select next value for Geral.SequenciaID",
      CodEmpresa: IDs.CodEmpresa,
      CodFilial: IDs.CodFilial,
      CodTipoLancamento: obj.TipoLancamento,
      CodFolha: IDs.CodFolha,
      CodFuncionario: `(select Top 1 CodFuncionario from ${
        IDs.TabelaFunc
      } where dbo.SoNumero(CPF) = '${StringApenasNumero(
        obj.cpf
      )}' and Ativo = 'S')`,
      Historico: aspas(obj.descricao),
      NumeroDocumento: aspas(StringApenasNumero(obj.cpf.substring(0, 10))),
      Valor: obj.valor,
      Origem: aspas("Manual"),
      Cancelado: aspas("N"),
      GeraFinanceiro: aspas("N"),
      NomeUsuario: aspas(IDs.NomeUsuario),
      EstacaoTrabalho: aspas(IDs.EstacaoTrabalho),

      CodContaFinanceira: null,
      CodNatureza: null,
      CodContaContabil: null,
      CodCentroCusto: null,
      CodItemContabil: null,
      Data: "dbo.DataAtual()",
      DataLancamento: "dbo.DataAtual()",
      HoraLancamento: "dbo.HoraAtual()",
      ValorQuantidade: 1,
      CodFolhaOrigem: 0,
    };

    let lineInsert = `IF EXISTS ((select * from FolhaLite.Funcionario where dbo.SoNumero(CPF) = '${StringApenasNumero(
      obj.cpf
    )}' and Ativo = 'S'))\n`;

    lineInsert += `INSERT INTO ${IDs.TabelaLanc} (`;
    /////CAMPOS DO INSERT
    Object.keys(ValorComum).forEach((key) => {
      lineInsert += key + ", ";
    });
    lineInsert = lineInsert.substring(0, lineInsert.length - 2);
    lineInsert += ") (";
    /////VALORES DO INSERT
    Object.keys(ValorComum).forEach((key) => {
      lineInsert += ValorComum[key] + ", ";
    });
    lineInsert = lineInsert.substring(0, lineInsert.length - 2);
    lineInsert += `);\n `;
    /////ANEXA A LINHA NO ARQUIVO
    Inserts.push(lineInsert);
    AppendFile(lineInsert);
  });
  AppendFile("GO \n");
  return Inserts;
}
export default GenerateInsert;
