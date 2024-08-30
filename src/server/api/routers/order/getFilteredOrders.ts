import { TRPCError } from "@trpc/server";
import qs from "qs";
import { z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }),
  filters: z.object({
    orderStatuses: z.array(z.number()),
    paymentMethods: z.array(z.number()),
    salesChannels: z.array(z.number()),
    salesAgents: z.array(z.number()),
  }),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
  }),
});

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        customerName: z.string(),
        attentionTo: z.string().nullable(),
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
        telegramMessage: z
          .object({
            message_id: z.number(),
            chat_id: z.number(),
          })
          .nullable(),
        fulfilmentStart: z.string().nullable(),
        fulfilmentEnd: z.string().nullable(),
        deliveryFee: z.number().nullable(),
        sales_agents: z.object({
          data: z.array(
            z.object({
              id: z.number(),
              attributes: z.object({ name: z.string() }),
            }),
          ),
        }),
        payment_method: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ paymentMethod: z.string() }),
            })
            .nullable(),
        }),
        payment_status: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ paymentStatus: z.string() }),
            })
            .nullable(),
        }),
        sales_channel: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ salesChannel: z.string() }),
            })
            .nullable(),
        }),
        order_status: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ orderStatus: z.string() }),
            })
            .nullable(),
        }),
        fulfilment_method: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ fulfilmentMethod: z.string() }),
            })
            .nullable(),
        }),
      }),
    }),
  ),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      pageCount: z.number(),
      total: z.number(),
    }),
  }),
});

export const getFilteredOrders = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const {
      filters: { orderStatuses, paymentMethods, salesChannels, salesAgents },
      sort,
      pagination,
    } = input;

    const queryParams = {
      sort: `${sort.field}:${sort.direction}`,
      filters: {
        order_status: {
          id: {
            $in: orderStatuses,
          },
        },
        payment_method: {
          id: {
            $in: paymentMethods,
          },
        },
        sales_channel: {
          id: {
            $in: salesChannels,
          },
        },
        sales_agents: {
          id: {
            $in: salesAgents,
          },
        },
      },
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
      pagination,
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    // Call the API to get the filtered orders
    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/orders?${queryParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
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
      console.error("Failed to fetch orders", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "An unknown error occurred while fetching orders from the Strapi API. Please try again later.",
      });
    }
  });
