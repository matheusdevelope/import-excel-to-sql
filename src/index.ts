import fs from "fs";
import { hostname } from "os";
import { exec } from "child_process";
import { join, resolve, normalize } from "path";
import { GetFromExcel } from "./parse_excel";
import getParamsTerminal from "./inputCMD";
import GenerateInsert from "./GenerateInsertSql";
import { ConnectionSQL, Insert } from "./mssql";
const Params:
  | {
      [key: string]: string;
    }
  | boolean = getParamsTerminal();

function HashUnique(size: number) {
  let dt = new Date().getTime();
  let base_size = "xxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxxxxx";
  let new_size = base_size.substring(0, Number(size) < 5 ? 5 : Number(size));
  let uuid = new_size.replace(/[xy]/g, function (c) {
    let r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}
function SelectPadrao(Campo: string) {
  return `(select ${Campo} from Customizado_Dados_Folha_Importacao WHERE Atual = 'S')`;
}

let path = resolve(
  Params ? Params.output_file : "",
  "insert-" +
    HashUnique(5) +
    "-" +
    new Date().toLocaleDateString().replace(/[\/"]/g, "-") +
    ".sql"
);
path = normalize(path);

const IDs: IIds = {
  CodEmpresa: SelectPadrao("CodEmpresa"),
  CodFilial: SelectPadrao("CodFilial"),
  CodFolha: SelectPadrao("CodFolha"),
  BaseDeDados: Params ? Params.db : "",
  UserBaseDeDados: Params ? Params.dbuser : "",
  SenhaBaseDeDados: Params ? Params.dbpw : "",
  TabelaFunc: Params ? Params.tabelaFunc : "",
  TabelaLanc: Params ? Params.tabelaLanc : "",
  EstacaoTrabalho: hostname(),
  NomeUsuario: "Administrador",
  output_file: path,
  servidor: Params ? Params.servidor : "",
  port: Params ? Params.dbport : "",
};

function LimparValorNumber(valor: string = "") {
  const cleanValue = valor
    .replace(" ", "")
    .replace("R$", "")
    .replace("-", "")
    .replace(",", ".");
  return Number(cleanValue);
}

async function Finish(data: { [key: string]: string }[]) {
  let ValuesToIsert: IValuesToInsert[] = [];

  const DataLiquido = data
    .map((obj) => {
      return {
        cpf: obj.cpf,
        cnpj_empresa: obj.cnpj_empresa,
        valor: LimparValorNumber(obj.valor_liquido),
        descricao: "Horas Normais",
        TipoLancamento: SelectPadrao("CodTipoLancamentoLiquido"),
      };
    })
    .filter((obj) => obj.valor && Number(obj.valor) > 0);
  const DataHora100 = data
    .map((obj) => {
      return {
        cpf: obj.cpf,
        cnpj_empresa: obj.cnpj_empresa,
        valor: LimparValorNumber(obj.valor_hora_extra_100),
        descricao: "Horas Extra 100%",
        TipoLancamento: SelectPadrao("CodTipoLancamento100"),
      };
    })
    .filter((obj) => obj.valor && Number(obj.valor) > 0);
  const DataHora50 = data
    .map((obj) => {
      return {
        cpf: obj.cpf,
        cnpj_empresa: obj.cnpj_empresa,
        valor: LimparValorNumber(obj.valor_hora_extra_50),
        descricao: "Horas Extra 50%",
        TipoLancamento: SelectPadrao("CodTipoLancamento50"),
      };
    })
    .filter((obj) => obj.valor && Number(obj.valor) > 0);
  const DataAdcNoturno = data
    .map((obj) => {
      return {
        cpf: obj.cpf,
        cnpj_empresa: obj.cnpj_empresa,
        valor: LimparValorNumber(obj.valor_hora_noturna || ""),
        descricao: "Adicional Noturno",
        TipoLancamento: SelectPadrao("CodTipoLancamentoNoturno"),
      };
    })
    .filter((obj) => obj.valor && Number(obj.valor) > 0);
  ValuesToIsert = [
    ...DataLiquido,
    ...DataHora100,
    ...DataHora50,
    ...DataAdcNoturno,
  ];

  const Inserts = GenerateInsert(ValuesToIsert, IDs);

  if (Number(typeof Params == "object" ? Params.json : 0) === 1) {
    if (data.length > 1) {
      fs.appendFileSync(
        path.substring(0, path.length - 4) + "-JSON.json",
        JSON.stringify(data, null, "\n")
      );
    }
  }

  if (Number(typeof Params == "object" ? Params.acao : 0) == 2) {
    exec("explorer.exe /select, " + path, (ret) => null);
    return;
  }
  try {
    const SQL = await ConnectionSQL(IDs);
    for (let i = 0; i < Inserts.length; i++) {
      const element = Inserts[i];
      try {
        await Insert(SQL, element);
        console.log("INSERT: \n>>> ", element);
      } catch (error) {
        console.log("ERROR:  \n>>> " + element, error);
      }
    }
    SQL.close();
  } catch (error) {
    console.log("ERROR:  \n>>> ", error);
    return;
  }
}

if (Params) {
  exec(join(Params.path_dialog + " -f"), async (error, stdout, stderr) => {
    if (stdout) {
      if (stdout.trim() === "None") {
        console.log(new Error("Nothing selected"));
      } else {
        const ListPath = stdout.trim().split(/\r\n|\n/g);

        let DataToInsert: { [key: string]: string }[] = [];
        for (let i = 0; i < ListPath.length; i++) {
          const path = ListPath[i];
          const Data = await GetFromExcel(path);
          DataToInsert = [...DataToInsert, ...Data];
        }
        await Finish(DataToInsert);
      }
    } else if (error) {
      console.log(error);
    } else if (stderr) {
      console.log(new Error(stderr));
    }
  });
}
