import assert from "node:assert/strict";
import test from "node:test";
import { selectDevelopmentName } from "../src/lib/construction-portal.ts";

const projects = [
  { developmentName: "Malabrigo Club Resort" },
  { developmentName: "Malabrigo Club Resort" },
  { developmentName: "Costa Azul" },
];

test("abre el proyecto elegido desde el submenú", () => {
  assert.equal(selectDevelopmentName(projects, "Costa Azul"), "Costa Azul");
});

test("usa el primer proyecto disponible si falta la selección o ya no existe", () => {
  assert.equal(selectDevelopmentName(projects), "Malabrigo Club Resort");
  assert.equal(selectDevelopmentName(projects, "Inactivo"), "Malabrigo Club Resort");
  assert.equal(selectDevelopmentName([]), undefined);
});
