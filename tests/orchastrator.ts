import retry from "async-retry";
import { faker } from "@faker-js/faker";
import * as util from "node:util";
import { exec } from "node:child_process";

import database from "../infra/database";
import user from "../models/user";
import session from "../models/session";

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
  await runPendingMigrations();
}

const execAsync = util.promisify(exec);

async function runPendingMigrations() {
  console.log('Executando migrations do Prisma...');
  try {
    const { stdout } = await execAsync('npx prisma migrate deploy');
    console.log(stdout);
  } catch (error) {
    console.error('Erro ao executar as migrations:', error);
    throw error;
  }
}

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
};

export default orchestrator;
