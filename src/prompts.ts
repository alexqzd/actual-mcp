import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { FinancialInsightsArgs, BudgetReviewArgs } from './types.js';
import { getDateRange } from './utils.js';
import { logger } from './core/logger.js';

export const promptsSchema = [
  {
    name: 'verify-transactions',
    description: 'Verificar que todas las transacciones están en Actual revisando saldos de cuentas',
  },
  {
    name: 'financial-insights',
    description: 'Generar análisis financiero y consejos',
    arguments: [
      {
        name: 'startDate',
        description: 'Fecha de inicio en formato YYYY-MM-DD',
        required: false,
      },
      {
        name: 'endDate',
        description: 'Fecha de fin en formato YYYY-MM-DD',
        required: false,
      },
    ],
  },
  {
    name: 'budget-review',
    description: 'Revisar mi presupuesto y gastos',
    arguments: [
      {
        name: 'months',
        description: 'Número de meses a analizar',
        required: false,
      },
    ],
  },
  {
    name: 'actual-cleanup',
    description: 'Analizar presupuesto en busca de oportunidades de limpieza',
  },
];

const financialInsightsPrompt = (args: FinancialInsightsArgs): GetPromptResult => {
  const { startDate, endDate } = args || {};
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  return {
    description: `Análisis financiero y recomendaciones del ${start} al ${end}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Por favor analiza mis datos financieros y proporciona análisis y recomendaciones. Enfócate en patrones de gasto, tasa de ahorro y áreas potenciales para optimizar mi presupuesto. Analiza los datos del ${start} al ${end}.

IMPORTANTE: Cualquier transacción en el grupo de categorías "Inversión y Ahorro" debe tratarse como ahorro POSITIVO, no como gasto. Estos representan dinero que estoy guardando para el futuro, por lo que deben contarse como logros de ahorro en lugar de gastos.

Puedes usar estas herramientas para recopilar los datos que necesitas:
1. Usa la herramienta spending-by-category para analizar el desglose de mis gastos
2. Usa la herramienta monthly-summary para obtener mis ingresos, gastos y tasa de ahorro
3. Usa la herramienta get-transactions para examinar transacciones específicas si es necesario

Cuando examines los resultados de spending-by-category:
- Busca cualquier grupo de categorías llamado "Inversión y Ahorro" o similar
- Considera estos montos como acciones financieras positivas (ahorrar/invertir), no como gastos
- Incluye estos montos al calcular mi tasa total de ahorro
- NO recomiendes reducir estos montos a menos que sean claramente insostenibles

Con base en este análisis, por favor proporciona:
1. Un resumen de mi situación financiera, incluyendo ahorro total (ahorro regular + inversiones)
2. Análisis clave sobre mis patrones de gasto (excluyendo inversiones/ahorros)
3. Áreas donde podría estar gastando de más (enfocándose solo en categorías de consumo)
4. Recomendaciones para optimizar mi presupuesto mientras mantengo o incremento ahorros/inversiones
5. Cualquier otro consejo financiero relevante
`,
        },
      },
    ],
  };
};

const budgetReviewPrompt = (args: BudgetReviewArgs): GetPromptResult => {
  const { months = 3 } = args || {};

  return {
    description: `Revisión de presupuesto de los últimos ${months} meses`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Por favor revisa mi presupuesto y gastos de los últimos ${months} meses. Me gustaría entender qué tan bien estoy cumpliendo con mi presupuesto y dónde podría hacer ajustes.

IMPORTANTE: Cualquier transacción en el grupo de categorías "Inversión y Ahorro" debe tratarse como ahorro POSITIVO, no como gasto. Estos representan dinero que estoy guardando para el futuro, por lo que deben contarse como logros de ahorro en lugar de gastos.

Para recopilar estos datos:
1. Usa la herramienta spending-by-category para ver el desglose de mis gastos
2. Usa la herramienta monthly-summary para obtener mis ingresos y gastos generales
3. Usa la herramienta get-transactions si necesitas revisar transacciones específicas

Al analizar los datos:
- Las categorías en el grupo "Inversión y Ahorro" son acciones financieras positivas, no gastos
- Incluye estos montos en el cálculo de mi tasa total de ahorro
- No sugieras reducir estos montos a menos que sean claramente insostenibles para mi nivel de ingresos

Por favor proporciona:
1. Un análisis de mis principales categorías de gasto (excluyendo ahorros/inversiones)
2. Si mis gastos son consistentes mes a mes
3. Mi tasa total de ahorro incluyendo tanto ahorro regular como inversiones
4. Áreas donde podría reducir gastos discrecionales
5. Sugerencias para ajustes realistas del presupuesto para maximizar ahorros/inversiones
`,
        },
      },
    ],
  };
};

const actualCleanupPrompt = (): GetPromptResult => {
  return {
    description: 'Analizar presupuesto en busca de oportunidades de limpieza',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Por favor revisa la estructura de mi presupuesto y sugiere acciones de limpieza o mantenimiento. Enfócate en simplificar y organizar los siguientes recursos:

1. **Beneficiarios (Payees)**: Identifica beneficiarios potencialmente duplicados (ej., mismo nombre o misma cuenta de transferencia), beneficiarios que ya no están en uso (no usados en ninguna transacción por 6+ meses), o aquellos con nombres poco claros.

2. **Categorías y Grupos de Categorías**:
   - Encuentra categorías o grupos de categorías vacíos
   - Resalta nombres de categorías superpuestos o poco claros
   - Sugiere fusionar o eliminar categorías poco usadas

3. **Opcional - Cuentas**: Sugiere cerrar o archivar cualquier cuenta inactiva o con saldo cero que no se haya usado recientemente.

Puedes usar estas herramientas para recopilar los datos necesarios:
- \`get-payees\`
- \`get-grouped-categories\`
- \`get-transactions\` (para verificar actividad reciente)
- \`get-accounts\` (opcional, para cuentas inactivas)

Por favor proporciona:
1. Una lista de sugerencias de limpieza con una breve explicación para cada una
2. Agrupa las sugerencias por tipo (beneficiarios, categorías, etc.)
3. Prioriza sugerencias que mejoren la claridad, reduzcan el desorden o prevengan confusión en la gestión futura del presupuesto
4. Cualquier consejo adicional para ayudar a mantener una estructura de presupuesto ordenada y comprensible en el futuro
`,
        },
      },
    ],
  };
};

const verifyTransactionsPrompt = (): GetPromptResult => {
  return {
    description: 'Verificar que todas las transacciones están en Actual revisando saldos de cuentas',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Ayúdame a revisar que todas mis transacciones están en Actual. Necesito el saldo de cada cuenta en el presupuesto para que yo pueda revisar en mis apps de los bancos si algún saldo no coincide y determinar qué transacciones faltan por agregar.

Por favor usa las siguientes herramientas para obtener la información necesaria:
1. Usa la herramienta \`get-accounts\` para obtener la lista de todas mis cuentas y sus saldos actuales
2. Para cada cuenta, muéstrame:
   - Nombre de la cuenta
   - Saldo actual en Actual Budget
   - Tipo de cuenta inferido (ej., crédito, débito, efectivo, inversión, etc.)
   - Última fecha de actualización (si está disponible)

Presenta los saldos de forma clara y organizada para que pueda compararlos fácilmente con los saldos en mis aplicaciones bancarias. Si encuentras alguna discrepancia potencial o cuenta con datos inusuales, indícalo.

**IMPORTANTE**: Algunas aplicaciones bancarias no proporcionan saldos directamente. En estos casos, te proporcionaré las transacciones más recientes de esa cuenta para que puedas verificar si ya están registradas en Actual Budget. Prepárate para:
- Recibir una lista de transacciones recientes de mis apps bancarias
- Buscar esas transacciones en Actual usando la herramienta \`get-transactions\` filtrada por cuenta
- Indicarme cuáles transacciones YA existen en Actual y cuáles NO están registradas aún
- Ayudarme a agregar de una en una las transacciones que falten usando la herramienta \`create-transaction\`

Si encuentro que algún saldo no coincide con mi banco o si te proporciono transacciones para verificar, ayúdame a identificar exactamente qué transacciones podrían estar faltando.
`,
        },
      },
    ],
  };
};

// ----------------------------
// PROMPTS
// ----------------------------

export const setupPrompts = (server: Server): void => {
  /**
   * Handler for listing available prompts
   */
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: promptsSchema,
    };
  });

  /**
   * Handler for getting prompts
   */
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      const { name, arguments: promptArgs } = request.params;

      switch (name) {
        case 'verify-transactions': {
          return verifyTransactionsPrompt();
        }

        case 'financial-insights': {
          return financialInsightsPrompt(promptArgs as FinancialInsightsArgs);
        }

        case 'budget-review': {
          return budgetReviewPrompt(promptArgs as unknown as BudgetReviewArgs);
        }

        case 'actual-cleanup': {
          return actualCleanupPrompt();
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error) {
      logger.error('prompts', { message: `Error getting prompt ${request.params.name}`, error });
      throw error instanceof Error ? error : new Error(String(error));
    }
  });
};
