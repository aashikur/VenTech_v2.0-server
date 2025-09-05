const { z } = require("zod");

const shopRequestSchema = z.object({
  shopDetails: z.object({
    shopName: z.string().min(2),
    shopNumber: z.string().min(1),
    shopAddress: z.string().min(3),
    tradeLicense: z.string().optional().nullable(),
  }),
});

module.exports = { shopRequestSchema };
