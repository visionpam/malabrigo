import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const sources = {
  departments: "https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/1_ubigeo_departamentos.json",
  provinces: "https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/2_ubigeo_provincias.json",
  districts: "https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/3_ubigeo_distritos.json",
  colombia: "https://raw.githubusercontent.com/open-admin-data/colombia-administrative-divisions/master/data/hierarchy.json",
};

async function load(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  return response.json();
}

const normalize = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const main = async () => {
  const [departments, provinces, districts, colombia] = await Promise.all(Object.values(sources).map(load));
  const peDepartments = departments.ubigeo_departamentos;
  const peProvinces = provinces.ubigeo_provincias;
  const peDistricts = districts.ubigeo_distritos;
  const client = await db.connect();
  try { await client.query("BEGIN");
    const insertMany = async (table, columns, rows) => { const values = rows.map((row, i) => `(${row.map((_, j) => `$${i * row.length + j + 1}`).join(",")})`).join(","); const flat = rows.flat(); await client.query(`INSERT INTO ${table}(${columns}) VALUES ${values} ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,active=true,sort_order=EXCLUDED.sort_order`, flat); };
    await insertMany("address_regions", "code,country_code,name,sort_order", peDepartments.map((item) => [`PE-${item.ubigeo}`, "PE", normalize(item.departamento), item.id]));
    await insertMany("address_provinces", "code,region_code,name,sort_order", peProvinces.map((item) => [`PE-${item.ubigeo}`, `PE-${peDepartments[item.departamento_id - 1].ubigeo}`, normalize(item.provincia), item.id]));
    await insertMany("address_districts", "code,province_code,name,sort_order", peDistricts.map((item) => [`PE-${item.ubigeo}`, `PE-${peProvinces[item.provincia_id - 1].ubigeo}`, normalize(item.distrito), item.id]));
    const departmentsCo = colombia.data;
    const municipalities = departmentsCo.flatMap((department) => (department.municipality ?? []).map((municipality) => ({ ...municipality, parent: department.id })));
    for (let index = 0; index < departmentsCo.length; index += 1) {
      const item = departmentsCo[index];
      await client.query(`INSERT INTO address_regions(code,country_code,name,sort_order) VALUES($1,'CO',$2,$3) ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,active=true,sort_order=EXCLUDED.sort_order`, [item.id, normalize(item.name.local), index + 1]);
      await client.query(`INSERT INTO address_provinces(code,region_code,name,sort_order) VALUES($1,$2,'No aplica',1) ON CONFLICT(code) DO UPDATE SET active=true`, [`${item.id}-NA`, item.id]);
    }
    const coDistrictRows = municipalities.map((item, index) => { const parent = typeof item.parent === "string" ? item.parent : item.parent?.id; const name = typeof item.name === "string" ? item.name : item.name?.local; return parent && name ? [item.id, `${parent}-NA`, normalize(name), index + 1] : null; }).filter(Boolean);
    await insertMany("address_districts", "code,province_code,name,sort_order", coDistrictRows);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

main().finally(() => db.end());
