import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum DeviceType {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  endpoint: string;

  @Column({ nullable: true })
  p256dh: string;

  @Column({ nullable: true })
  auth: string;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: DeviceType,
    nullable: true,
  })
  deviceType: DeviceType;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
