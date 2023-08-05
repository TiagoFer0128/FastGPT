import type { Mongoose } from 'mongoose';
import type { Agent } from 'http';
import type { Pool } from 'pg';
import type { Tiktoken } from '@dqbd/tiktoken';
import { ChatModelItemType, QAModelItemType, VectorModelItemType } from './model';

export type PagingData<T> = {
  pageNum: number;
  pageSize: number;
  data: T[];
  total?: number;
};

export type RequestPaging = { pageNum: number; pageSize: number; [key]: any };

export type FeConfigsType = {
  show_emptyChat?: boolean;
  show_register?: boolean;
  show_appStore?: boolean;
  show_userDetail?: boolean;
  show_git?: boolean;
  systemTitle?: string;
  authorText?: string;
  beianText?: string;
  googleClientVerKey?: string;
  baiduTongjiUrl?: string;
};
export type SystemEnvType = {
  googleServiceVerKey?: string;
  vectorMaxProcess: number;
  qaMaxProcess: number;
  pgIvfflatProbe: number;
};
type PluginItemType = {
  url: string;
  auth: string;
};
export type PluginType = {
  authCode?: PluginItemType;
  moderationsCheck?: PluginItemType;
};

declare global {
  var mongodb: Mongoose | string | null;
  var pgClient: Pool | null;
  var httpsAgent: Agent;
  var qaQueueLen: number;
  var vectorQueueLen: number;
  var OpenAiEncMap: Tiktoken;
  var sendInformQueue: (() => Promise<void>)[];
  var sendInformQueueLen: number;

  var feConfigs: FeConfigsType;
  var systemEnv: SystemEnvType;
  var;
  var chatModels: ChatModelItemType[];
  var qaModels: QAModelItemType[];
  var vectorModels: VectorModelItemType[];

  interface Window {
    ['pdfjs-dist/build/pdf']: any;
    particlesJS: any;
    grecaptcha: any;
    QRCode: any;
  }
}
