export const PAYMENT_CONCEPT_VALUES = ["SEPARATION", "DOWN_PAYMENT", "INSTALLMENT", "OTHER"] as const;

export type PaymentConceptValue = (typeof PAYMENT_CONCEPT_VALUES)[number];

export const paymentConceptLabels: Record<PaymentConceptValue, string> = {
  SEPARATION: "Separación",
  DOWN_PAYMENT: "Cuota inicial",
  INSTALLMENT: "Cuota del cronograma",
  OTHER: "Otro pago",
};

export const paymentConceptOptions = PAYMENT_CONCEPT_VALUES.map((value) => ({
  value,
  label: paymentConceptLabels[value],
}));
