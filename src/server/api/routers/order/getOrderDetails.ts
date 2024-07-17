import { TRPCError } from "@trpc/server";
import qs from "qs";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  orderId: z.string(),
});
const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      customerName: z.string(),
      customerContact: z.string(),
      customerAddress: z.string(),
      orderProducts: z.array(
        z.object({
          sku: z.string(),
          name: z.string(),
          brand: z.string(),
          price: z.number(),
          category: z.string(),
          quantity: z.number(),
          productId: z.number(),
        }),
      ),
      remarks: z.string(),
      orderCollectionDateTime: z.string(),
      orderId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      fulfilmentStart: z.string().nullable(),
      fulfilmentEnd: z.string().nullable(),
      deliveryFee: z.number().nullable(),
      telegramMessage: z
        .object({
          message_id: z.number(),
          chat_id: z.number(),
        })
        .nullable(),
      sales_agents: z.object({
        data: z.array(
          z.object({
            id: z.number(),
            attributes: z.object({ name: z.string() }),
          }),
        ),
      }),
      payment_method: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ paymentMethod: z.string() }),
        }),
      }),
      payment_status: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ paymentStatus: z.string() }),
        }),
      }),
      sales_channel: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ salesChannel: z.string() }),
        }),
      }),
      order_status: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ orderStatus: z.string() }),
        }),
      }),
      fulfilment_method: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ fulfilmentMethod: z.string() }),
        }),
      }),
    }),
  }),
  meta: z.object({}),
});

export const getOrderDetails = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const { orderId } = input;

    // Fetch the order details from Strapi API
    const queryParams = {
      populate: {
        sales_agents: {
          fields: ["name"],
        },
        payment_method: {
          fields: ["paymentMethod"],
        },
        payment_status: {
          fields: ["paymentStatus"],
        },
        sales_channel: {
          fields: ["salesChannel"],
        },
        order_status: {
          fields: ["orderStatus"],
        },
        fulfilment_method: {
          fields: ["fulfilmentMethod"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      const response = await fetch(
        `${process.env.STRAPI_API_URL}/api/orders/${orderId}?${queryParamsString}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        },
      );
      const data = await response.json();
      if (response.ok) return data;

      if (response.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "Provided credentials are invalid. Please provide the correct credentials.",
        });
      }
      if (response.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Requested endpoint not found. Please check the request",
        });
      }
      if (response.status === 403) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Credentials are required to access the requested endpoint. Please provide the correct credentials.",
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: data.error.message,
      });
    } catch (error) {
      console.error("Failed to fetch order details", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "An unknown error occurred while fetching order details from the Strapi API. Please try again later.",
      });
    }
  });
