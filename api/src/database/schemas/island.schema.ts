import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IconKey, TotemType } from '../../common/types/domain.types';

@Schema({ _id: false })
export class TotemSpecificConfig {
  // Para http_ping
  @Prop({ type: String })
  targetUrl?: string;

  @Prop({ type: Number })
  expectedStatusMin?: number;

  @Prop({ type: Number })
  expectedStatusMax?: number;

  @Prop({ type: Number })
  warningLatencyMs?: number;

  // Para supabase_health
  @Prop({ type: String })
  supabaseUrl?: string;

  @Prop({ type: String })
  supabaseKeyEnvRef?: string;

  // Para n8n_workflow
  @Prop({ type: String })
  workflowId?: string;

  @Prop({ type: Boolean })
  tracksLlmTokens?: boolean;

  // Para vm_heartbeat
  @Prop({ type: [String], default: undefined })
  expectedContainers?: string[];

  @Prop({ type: Number })
  heartbeatTimeoutMinutes?: number;

  @Prop({ type: Number })
  ramWarningPercent?: number;

  @Prop({ type: Number })
  ramCriticalPercent?: number;

  @Prop({ type: Number })
  diskWarningPercent?: number;

  @Prop({ type: Number })
  diskCriticalPercent?: number;
}

export const TotemSpecificConfigSchema =
  SchemaFactory.createForClass(TotemSpecificConfig);

@Schema({ _id: false })
export class TotemConfig {
  @Prop({ type: String, required: true })
  totemId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, enum: Object.values(TotemType), required: true })
  type!: TotemType;

  @Prop({ type: String, enum: Object.values(IconKey), required: true })
  iconKey!: IconKey;

  @Prop({ type: Number, required: true, min: 1 })
  checkIntervalMinutes!: number;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: TotemSpecificConfigSchema, default: () => ({}) })
  config!: TotemSpecificConfig;
}

export const TotemConfigSchema = SchemaFactory.createForClass(TotemConfig);

@Schema({ collection: 'islands', timestamps: true })
export class Island {
  @Prop({ type: String, required: true })
  slug!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: false })
  isCore!: boolean;

  @Prop({ type: Number, required: true })
  order!: number;

  @Prop({ type: [TotemConfigSchema], default: [] })
  totems!: TotemConfig[];
}

export type IslandDocument = HydratedDocument<Island>;
export const IslandSchema = SchemaFactory.createForClass(Island);

IslandSchema.index({ slug: 1 }, { unique: true });
IslandSchema.index({ 'totems.totemId': 1 }, { unique: true, sparse: true });
