import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  TokenUsage,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';

@Schema({ _id: false })
export class ContainerMetric {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  status!: string;
}

export const ContainerMetricSchema =
  SchemaFactory.createForClass(ContainerMetric);

@Schema({ _id: false })
export class TokenUsageMetric implements TokenUsage {
  @Prop({ type: Number, required: true })
  promptTokens!: number;

  @Prop({ type: Number, required: true })
  completionTokens!: number;

  @Prop({ type: Number, required: true })
  totalTokens!: number;
}

export const TokenUsageMetricSchema =
  SchemaFactory.createForClass(TokenUsageMetric);

@Schema({ _id: false })
export class TotemLogMetrics {
  // Se type === 'vm_heartbeat'
  @Prop({ type: Number })
  cpuLoad1m?: number;

  @Prop({ type: Number })
  ramUsedMb?: number;

  @Prop({ type: Number })
  ramTotalMb?: number;

  @Prop({ type: Number })
  ramUsedPercent?: number;

  @Prop({ type: Number })
  diskPercent?: number;

  @Prop({ type: [ContainerMetricSchema], default: undefined })
  containers?: ContainerMetric[];

  // Se type === 'http_ping' ou 'supabase_health'
  @Prop({ type: Number, default: undefined })
  statusCode?: number | null;

  @Prop({ type: Number })
  latencyMs?: number;

  @Prop({ type: Boolean })
  isReachable?: boolean;

  // Se type === 'n8n_workflow'
  @Prop({ type: String })
  executionId?: string;

  @Prop({ type: Boolean })
  workflowActive?: boolean;

  @Prop({ type: String, enum: ['success', 'error', 'crashed', 'waiting'] })
  executionStatus?: 'success' | 'error' | 'crashed' | 'waiting';

  @Prop({ type: Number })
  durationMs?: number;

  @Prop({ type: TokenUsageMetricSchema, default: undefined })
  tokenUsage?: TokenUsageMetric | null;
}

export const TotemLogMetricsSchema =
  SchemaFactory.createForClass(TotemLogMetrics);

@Schema({ collection: 'totem_logs' })
export class TotemLog {
  @Prop({ type: String, required: true })
  totemId!: string;

  @Prop({ type: String, enum: Object.values(TotemType), required: true })
  type!: TotemType;

  @Prop({ type: String, enum: Object.values(TotemStatus), required: true })
  status!: TotemStatus;

  @Prop({ type: Date, required: true, default: () => new Date() })
  timestamp!: Date;

  @Prop({ type: String, maxlength: 300, default: null })
  summary?: string | null;

  @Prop({ type: TotemLogMetricsSchema, required: true, default: () => ({}) })
  metrics!: TotemLogMetrics;
}

export type TotemLogDocument = HydratedDocument<TotemLog>;
export const TotemLogSchema = SchemaFactory.createForClass(TotemLog);

// Compound Index para paginação instantânea no Drawer (< 300ms)
TotemLogSchema.index({ totemId: 1, timestamp: -1 });

// TTL Index de 14 dias (1209600 segundos)
TotemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 1209600 });

// Índice Único Parcial para deduplicação de execuções do n8n
TotemLogSchema.index(
  { totemId: 1, 'metrics.executionId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'metrics.executionId': { $exists: true } },
  },
);
