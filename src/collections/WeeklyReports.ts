import type { CollectionConfig, Access } from "payload";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

export const WeeklyReports: CollectionConfig = {
  slug: "weekly-reports",
  admin: {
    useAsTitle: "weekStart",
    defaultColumns: ["weekStart", "weekEnd", "status", "sentAt"],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  timestamps: true,
  fields: [
    {
      name: "weekStart",
      type: "date",
      required: true,
      admin: { description: "Start of the reporting week (Monday)" },
    },
    {
      name: "weekEnd",
      type: "date",
      required: true,
      admin: { description: "End of the reporting week (Sunday)" },
    },
    {
      name: "reportData",
      type: "json",
      required: true,
      admin: { description: "Full aggregated report payload" },
    },
    {
      name: "sentTo",
      type: "json",
      admin: { description: "Array of recipient email addresses" },
    },
    {
      name: "sentAt",
      type: "date",
      admin: { description: "When the email was sent" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Success", value: "success" },
        { label: "Failed", value: "failed" },
      ],
    },
  ],
};
