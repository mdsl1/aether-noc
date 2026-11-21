import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const ADMIN_AUTH_STATE_KEY = 'admin';

@Schema({
  collection: 'auth_state',
  timestamps: { createdAt: false, updatedAt: true },
})
export class AuthState {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  tokenVersion!: number;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}

export type AuthStateDocument = HydratedDocument<AuthState>;
export const AuthStateSchema = SchemaFactory.createForClass(AuthState);

AuthStateSchema.index({ key: 1 }, { unique: true });
