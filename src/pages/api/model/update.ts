import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { connectToDatabase } from '@/service/mongo';
import { authToken } from '@/service/utils/tools';
import { Model } from '@/service/models/model';
import type { ModelUpdateParams } from '@/types/model';
import { authModel } from '@/service/utils/auth';

/* 获取我的模型 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { name, search, share, service, security, systemPrompt, temperature } =
      req.body as ModelUpdateParams;
    const { modelId } = req.query as { modelId: string };
    const { authorization } = req.headers;

    if (!authorization) {
      throw new Error('无权操作');
    }

    if (!name || !service || !security || !modelId) {
      throw new Error('参数错误');
    }

    // 凭证校验
    const userId = await authToken(authorization);

    await connectToDatabase();

    await authModel({
      modelId,
      userId
    });

    // 更新模型
    await Model.updateOne(
      {
        _id: modelId,
        userId
      },
      {
        name,
        systemPrompt,
        temperature,
        'share.isShare': share.isShare,
        'share.isShareDetail': share.isShareDetail,
        'share.intro': share.intro,
        search,
        security
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
