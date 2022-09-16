import { exec } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";
const CREATE_SQL_SCRIPT = `
-->> CREATE TABELA DE CONFIGUR^ÇÂO PARA IMPORTAÇÃO
CREATE TABLE [dbo].[Customizado_Dados_Folha_Importacao](
	[ID] [varchar](10) NOT NULL,
	[CodEmpresa] [int] NULL,
	[CodFilial] [int] NULL,
	[CodFolha] [int] NULL,
	[CodTipoLancamentoLiquido] [int] NULL,
	[CodTipoLancamento50] [int] NULL,
	[CodTipoLancamento100] [int] NULL,
	[CodTipoLancamentoNoturno] [int] NULL,
	[Atual] [varchar](1) NULL,
	[DataCriacao] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

-->> CRIAR TRIGGER PARA MANTER APENAS UMA CONFIG PADRAO
 CREATE TRIGGER [dbo].tgr_ConfigAtual 
  ON [dbo].Customizado_Dados_Folha_Importacao
  for insert, update
  as
  begin
    declare   @ID int,
        @Atual varchar(1)
  
    select  @ID = inserted.ID, @Atual = inserted.Atual from inserted
  
    IF @Atual = 'S' 
    BEGIN
    UPDATE Customizado_Dados_Folha_Importacao set Atual = 'N' where ID <>@ID 
    END
  end
`;

function log(
  params: string | number | boolean,
  p2?: string | number | boolean
) {
  console.log(params, p2 || "");
}

function getParamsTerminal() {
  const input = process.argv.splice(2);
  const actual_path = process.pkg! ? process.cwd() : __dirname;

  const AcceptParams: {
    param: string;
    defaultValue: string | number | boolean;
    model: string;
    required: boolean;
    description: string;
  }[] = [
    {
      param: "--help",
      defaultValue: ".",
      model: "[]",
      required: false,
      description: "Exibe ajuda para uso",
    },
    {
      param: "--path_dialog",
      defaultValue: resolve(actual_path, "dialog.exe"),
      model: `[${resolve(actual_path, "dialog.exe")}] `,
      required: false,
      description: "Caminho do excutável de seleção dos arquivos.",
    },

    {
      param: "--output_file",
      defaultValue: resolve(actual_path, "..", "tmp"),
      model: `[${resolve(actual_path, "..", "tmp")}] `,
      required: false,
      description: "Pasta de destino do arquivo de insert gerado.",
    },
    {
      param: "--tabela_config",
      defaultValue: "",
      model: "[path de saida do arquivo] ",
      required: false,
      description:
        "Gera arquivo com as alterações necessárias no banco de dados para que o projeto possa funcionar como o esperado.",
    },

    {
      param: "--json",
      defaultValue: false,
      model: "[1]",
      required: false,
      description:
        "Use esse parametro para ter acesso ao dados antes da conversão parar INSERT.sql",
    },

    {
      param: "--executeinsertonly",
      defaultValue: false,
      model: "[y]",
      required: false,
      description:
        "Use esse parametro para fazer o INSERT.sql após conferência.",
    },
    {
      param: "--acao",
      defaultValue: 1,
      model: "[1] / [2]",
      required: false,
      description:
        "Caso a Acao seja [1] o sistema fará o insert direto no banco de dados, caso [2], o arquivo será aberto para conferencia e execução manual.",
    },

    {
      param: "--servidor",
      defaultValue: "localhost",
      model: "[localhost] ",
      required: false,
      description: "Servidor da base de dados.",
    },
    {
      param: "--dbport",
      defaultValue: 1433,
      model: "[1433] ",
      required: false,
      description: "Porta da base de dados.",
    },
    {
      param: "--db",
      defaultValue: "dbname",
      model: "[NomeDaBaseDeDados] ",
      required: true,
      description: "Nome da base de dados",
    },
    {
      param: "--dbuser",
      defaultValue: "username",
      model: "[username db] ",
      required: true,
      description: "Nome usuário da base de dados",
    },
    {
      param: "--dbpw",
      defaultValue: "your_strong_pass",
      model: "[SenhaBancoDeDados] ",
      required: true,
      description: "Senha da base de dados",
    },

    {
      param: "--tabelaLanc",
      defaultValue: "FolhaLite.Lancamento",
      model: "[FolhaLite.Lancamento] ",
      required: false,
      description: "Tabela no DB onde serão feitos os lançamentos",
    },
    {
      param: "--tabelaFunc",
      defaultValue: "FolhaLite.Funcionario",
      model: "[FolhaLite.Funcionario] ",
      required: false,
      description:
        "Tabela no DB onde serão buscados os dados dos funcionarios.",
    },
  ];

  let ParamsInput: {
    [key: string]: string;
  } = {};
  let Errors: {
    message: string;
    parametro: string;
  }[] = [];

  if (input.toString().toLowerCase().includes("--help") || input.length === 0) {
    Help();
    return false;
  }

  const GerarConfig = input.findIndex(
    (obj) => obj.toLowerCase() == "--tabela_config"
  );
  if (GerarConfig >= 0) {
    CriarArquivoTabelaAuxiliar(GerarConfig);
    return false;
  }

  function Help() {
    log("AJUDA>>>\n\n");
    log("Parametros aceitos >\n");
    AcceptParams.forEach((obj) => {
      log(obj.param + " " + obj.model);
      log("Descrição: ", obj.description);
      log("Valor padrão: ", obj.defaultValue);
      log("Obrigatório: ", obj.required.toString());
      log("-----------------------------");
    });
    log("\n");
  }

  function CriarArquivoTabelaAuxiliar(index: number) {
    function GetDefaultPath() {
      const ret = AcceptParams.find((obj) => obj.param === "--output_file");
      return String(ret?.defaultValue) || "";
    }
    let path = input[index + 1] ? input[index + 1] : GetDefaultPath();
    path = resolve(String(path), "configs_banco_de_dados.sql");

    writeFileSync(path, CREATE_SQL_SCRIPT);
    exec("explorer.exe /select, " + path, (ret) => null);
  }

  function AddError(message: string, parametro: string) {
    Errors.push({
      message,
      parametro,
    });
  }

  function ParamAccepted(param: string) {
    for (let i = 0; i < AcceptParams.length; i++) {
      if (AcceptParams[i].param.toLowerCase() === param.toLowerCase())
        return true;
    }
    return false;
  }

  input.forEach((text, i) => {
    if (text.includes("--")) {
      if (ParamAccepted(text)) {
        if (input[i + 1]) {
          ParamsInput[text.replace("--", "").toLowerCase()] = input[i + 1];
        } else {
          AddError("Informe um valor para o parametro informado", text);
        }
      } else {
        AddError("O parametro informado não é aceito.", text);
      }
    }
  });

  let Params: {
    [key: string]: string;
  } = {};
  AcceptParams.forEach((obj, i) => {
    const NameParam = obj.param.replace("--", "");
    if (AcceptParams[i].required && !ParamsInput[NameParam])
      AddError(
        "Um parametro obrigatório não foi informado! ",
        AcceptParams[i].param + " " + AcceptParams[i].model
      );
    Params[NameParam] =
      ParamsInput[NameParam] || String(AcceptParams[i].defaultValue);
  });

  if (Errors.length > 0) {
    log("\nAlgo deu errado!\n");

    log("Parametros recebidos: ", input.toString().replace(",", " "));
    log("\n");

    log("Parametros aceitos:");
    AcceptParams.forEach((obj) => log(obj.param, obj.model));
    log("\n");

    Errors.forEach((obj) => {
      log("----------------------------------");
      log("Mensagem: ", obj.message);
      log("Parametro: ", obj.parametro);
    });
    log("\n");
    return false;
  }

  return Params;
}
export default getParamsTerminal;
