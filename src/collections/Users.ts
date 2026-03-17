import type { CollectionConfig, Access } from "payload";
import { cookies } from "next/headers";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  hooks: {
    // MED-15: Default new users to "editor". Only bootstrap (first user) gets "admin".
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation === "create" && data) {
          const { totalDocs } = await req.payload.count({
            collection: "users",
          });
          if (totalDocs === 0) {
            data.role = "admin";
          } else if (!data.role) {
            data.role = "editor";
          }
        }
        return data;
      },
    ],
    afterLogin: [
      async () => {
        // Clear TOTP session cookie on every login so user must re-verify
        try {
          const cookieStore = await cookies();
          cookieStore.delete("totp_verified");
        } catch {
          // cookies() may not be available in non-Next.js contexts
        }
      },
    ],
  },
  admin: {
    useAsTitle: "email",
    components: {
      beforeList: ["/src/components/admin/BeforeCollectionList"],
    },
  },
  access: {
    read: isAdmin,
    create: async ({ req }) => {
      // Allow first user creation (bootstrap) when no users exist
      const user = req.user as { role?: string } | null;
      if (user?.role === "admin") return true;
      const { totalDocs } = await req.payload.count({ collection: "users" });
      return totalDocs === 0;
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      admin: {
        condition: (data, siblingData, { user }) => {
          // Hide on create-first-user (no logged-in user yet)
          return !!user;
        },
      },
      access: {
        update: ({ req }) => {
          const user = req.user as { role?: string } | null;
          return user?.role === "admin";
        },
      },
    },
    {
      name: "totpSecret",
      type: "text",
      admin: { hidden: true },
      access: {
        read: () => false,
        update: () => false,
      },
    },
    {
      name: "totpEnabled",
      type: "checkbox",
      defaultValue: false,
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Two-factor authentication status",
        components: {
          Cell: "/src/components/admin/BooleanCell",
        },
      },
    },
  ],
};
