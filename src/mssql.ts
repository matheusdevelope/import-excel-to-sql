import { connect, ConnectionPool } from "mssql";

export async function Insert(SQl: ConnectionPool, query: string) {
  try {
    await SQl.query(query);
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function ConnectionSQL(IDs: IIds) {
  try {
    const Conection = await connect({
      server: IDs.servidor,
      port: Number(IDs.port) || 1433,
      database: IDs.BaseDeDados,
      user: IDs.UserBaseDeDados,
      password: IDs.SenhaBaseDeDados,
      options: {
        trustServerCertificate: true,
      },
    });
    return Promise.resolve(Conection);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
}
