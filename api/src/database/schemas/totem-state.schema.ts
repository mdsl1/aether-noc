import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { TotemStatus } from '../../common/types/domain.types';

@Schema({
  collection: 'totem_states',
  timestamps: { createdAt: false, updatedAt: true },
})
export class TotemState {
  @Prop({ type: String, required: true })
  totemId!: string;

  @Prop({ type: String, required: true })
  islandSlug!: string;

  @Prop({
    type: String,
    enum: Object.values(TotemStatus),
    default: TotemStatus.UNKNOWN,
  })
  status!: TotemStatus;

  @Prop({
    type: String,
    enum: Object.values(TotemStatus),
    default: TotemStatus.UNKNOWN,
  })
  previousStatus!: TotemStatus;

  @Prop({ type: String, default: null })
  statusReason!: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  consecutiveFailures!: number;

  @Prop({ type: Date, default: null })
  lastCheckAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastStatusChangeAt!: Date | null;

  @Prop({ type: String })
  lastProcessedExecutionId?: string;

  @Prop({ type: Date, default: null })
  lastAlertSentAt!: Date | null;

  @Prop({ type: Boolean, default: false })
  alertActive!: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  lastMetrics!: Record<string, unknown> | null;
}

export type TotemStateDocument = HydratedDocument<TotemState>;
export const TotemStateSchema = SchemaFactory.createForClass(TotemState);

TotemStateSchema.index({ totemId: 1 }, { unique: true });
TotemStateSchema.index({ islandSlug: 1 });
