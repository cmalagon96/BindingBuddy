import "dotenv/config";
import { getPayload } from "payload";
import config from "../payload.config";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script."
  );
  process.exit(1);
}

async function createAdmin() {
  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log(`Admin user "${email}" already exists.`);
    process.exit(0);
  }

  await payload.create({
    collection: "users",
    data: { email, password, role: "admin" },
  });

  console.log(`Admin user "${email}" created successfully.`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
