//@flow

import CryptoWorker from '../../crypto'
import getMsgKeyIv from './msg-key'
import { writeInt, writeIntBytes, writeLong } from '../../tl/writer'

import { NetMessage } from '../networker/net-message'
import { TypeWriter } from '../../tl/type-buffer'

import Logger from '../../util/log'

const log = Logger`encrypted message`


type ApiMessageProps = {
  ctx: TypeWriter,
  serverSalt: number[],
  sessionID: number[],
  message: NetMessage
}

type EncryptApiMessageProps = {
  bytes: ArrayBuffer,
  authKey: Uint8Array
}

type MtMessageProps = {
  ctx: TypeWriter,
  authKeyID: number[],
  msgKey: Uint8Array,
  encryptedBytes: ArrayBuffer
}


export const apiMessage = ({ ctx, serverSalt, sessionID, message }: ApiMessageProps) => {
  writeIntBytes(ctx, serverSalt, 64, 'salt')
  writeIntBytes(ctx, sessionID, 64, 'session_id')
  writeLong(ctx, message.msg_id, 'message_id')
  writeInt(ctx, message.seq_no, 'seq_no')

  writeInt(ctx, message.body.length, 'message_data_length')
  writeIntBytes(ctx, message.body, false, 'message_data')

  const apiBytes = ctx.getBuffer()

  return apiBytes
}

export const encryptApiBytes = async ({ bytes, authKey }: EncryptApiMessageProps) => {
  const bytesHash = await CryptoWorker.sha1Hash(bytes)
  const msgKey = new Uint8Array(bytesHash).subarray(4, 20)
  const [aesKey, aesIv] = await getMsgKeyIv(authKey, msgKey, true)
  const encryptedBytes = await CryptoWorker.aesEncrypt(bytes, aesKey, aesIv)

  return { encryptedBytes, msgKey }
}

export const mtMessage = ({ ctx, authKeyID, msgKey, encryptedBytes }: MtMessageProps) => {
  writeIntBytes(ctx, authKeyID, 64, 'auth_key_id')
  writeIntBytes(ctx, msgKey, 128, 'msg_key')
  writeIntBytes(ctx, encryptedBytes, false, 'encrypted_data')

  const mtBytes = ctx.getArray()

  return mtBytes
}

