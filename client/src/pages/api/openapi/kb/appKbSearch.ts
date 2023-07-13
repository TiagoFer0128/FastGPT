import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { authUser } from '@/service/utils/auth';
import { PgClient } from '@/service/pg';
import { withNextCors } from '@/service/utils/tools';
import type { ChatItemType } from '@/types/chat';
import type { AppSchema } from '@/types/mongoSchema';
import { authApp } from '@/service/utils/auth';
import { ChatModelMap } from '@/constants/model';
import { ChatRoleEnum } from '@/constants/chat';
import { openaiEmbedding } from '../plugin/openaiEmbedding';
import { modelToolMap } from '@/utils/plugin';

export type QuoteItemType = {
  id: string;
  q: string;
  a: string;
  source?: string;
};
type Props = {
  prompts: ChatItemType[];
  similarity: number;
  limit: number;
  appId: string;
};
type Response = {
  rawSearch: QuoteItemType[];
  userSystemPrompt: {
    obj: ChatRoleEnum;
    value: string;
  }[];
  userLimitPrompt: {
    obj: ChatRoleEnum;
    value: string;
  }[];
  quotePrompt: {
    obj: ChatRoleEnum;
    value: string;
  };
};

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { userId } = await authUser({ req });

    if (!userId) {
      throw new Error('userId is empty');
    }

    const { prompts, similarity, limit, appId } = req.body as Props;

    if (!similarity || !Array.isArray(prompts) || !appId) {
      throw new Error('params is error');
    }

    // auth app
    const { app } = await authApp({
      appId,
      userId
    });

    const result = await appKbSearch({
      app,
      userId,
      fixedQuote: [],
      prompt: prompts[prompts.length - 1],
      similarity,
      limit
    });

    jsonRes<Response>(res, {
      data: result
    });
  } catch (err) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});

export async function appKbSearch({
  app,
  userId,
  fixedQuote = [],
  prompt,
  similarity = 0.8,
  limit = 5
}: {
  app: AppSchema;
  userId: string;
  fixedQuote?: QuoteItemType[];
  prompt: ChatItemType;
  similarity: number;
  limit: number;
}): Promise<Response> {
  const modelConstantsData = ChatModelMap[app.chat.chatModel];

  // get vector
  const promptVector = await openaiEmbedding({
    userId,
    input: [prompt.value]
  });

  // search kb
  const res: any = await PgClient.query(
    `BEGIN;
    SET LOCAL ivfflat.probes = ${global.systemEnv.pgIvfflatProbe || 10};
    select id,q,a,source from modelData where kb_id IN (${app.chat.relatedKbs
      .map((item) => `'${item}'`)
      .join(',')}) AND vector <#> '[${promptVector[0]}]' < -${similarity} order by vector <#> '[${
      promptVector[0]
    }]' limit ${limit};
    COMMIT;`
  );

  const searchRes: QuoteItemType[] = res?.[2]?.rows || [];

  // filter same search result
  const idSet = new Set<string>();
  const filterSearch = [
    ...searchRes.slice(0, 3),
    ...fixedQuote.slice(0, 2),
    ...searchRes.slice(3),
    ...fixedQuote.slice(2, Math.floor(fixedQuote.length * 0.4))
  ].filter((item) => {
    if (idSet.has(item.id)) {
      return false;
    }
    idSet.add(item.id);
    return true;
  });

  // 计算固定提示词的 token 数量
  const userSystemPrompt = app.chat.systemPrompt // user system prompt
    ? [
        {
          obj: ChatRoleEnum.System,
          value: app.chat.systemPrompt
        }
      ]
    : [];
  const userLimitPrompt = [
    {
      obj: ChatRoleEnum.Human,
      value: app.chat.limitPrompt
        ? app.chat.limitPrompt
        : `知识库是关于 ${app.name} 的内容，参考知识库回答问题。与 "${app.name}" 无关内容，直接回复: "我不知道"。`
    }
  ];

  const fixedSystemTokens = modelToolMap.countTokens({
    model: app.chat.chatModel,
    messages: [...userSystemPrompt, ...userLimitPrompt]
  });

  // filter part quote by maxToken
  const sliceResult = modelToolMap
    .tokenSlice({
      model: app.chat.chatModel,
      maxToken: modelConstantsData.systemMaxToken - fixedSystemTokens,
      messages: filterSearch.map((item, i) => ({
        obj: ChatRoleEnum.System,
        value: `${i + 1}: [${item.q}\n${item.a}]`
      }))
    })
    .map((item) => item.value)
    .join('\n')
    .trim();

  // slice filterSearch
  const rawSearch = filterSearch.slice(0, sliceResult.length);

  const quoteText = sliceResult ? `知识库:\n${sliceResult}` : '';

  return {
    rawSearch,
    userSystemPrompt,
    userLimitPrompt,
    quotePrompt: {
      obj: ChatRoleEnum.System,
      value: quoteText
    }
  };
}
