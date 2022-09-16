import readXlsxFile, { Row } from "read-excel-file/node";

let ListaValoresExcel: {
  [key: string]: string;
}[] = [];
async function GetFromExcel(path_file: string) {
  if (path_file) {
    const Xls = await readXlsxFile(path_file);

    let Header: Row = [];
    let Rows: Row[] = [];
    Xls.map((row, index) => {
      if (index === 0) {
        Header = row;
      }
      if (index > 0) {
        Rows.push(row);
      }
    });
    await CreateObjcts(Header, Rows);
  }
  return ListaValoresExcel;
}

async function CreateObjcts(header: Row, rows: Row[]) {
  const NamesToFind: {
    [key: string]: string;
  } = {
    cpf: "CPF",
    valor_liquido: "VALOR LIQUIDO R$",
    valor_hora_extra_50: "HORA EXTRA 50% R$",
    valor_hora_extra_100: "HORA EXTRA 100% R$",
    valor_hora_noturna: "VLR. Noturno R$",
    cnpj_empresa: "CNPJ Empresa",
  };
  for (let props in NamesToFind) {
    header.forEach((obj, index) => {
      if (obj.toString().toLowerCase() === NamesToFind[props].toLowerCase()) {
        GenerateOBJ(props, index);
      }
    });
  }
  async function GenerateOBJ(props: string, index: number) {
    rows.forEach((obj, i) => {
      if (!ListaValoresExcel[i]) {
        ListaValoresExcel.push({});
      }
      ListaValoresExcel[i][props] = obj[index]?.toString();
    });
    return;
  }
  return;
}

export { GetFromExcel };
