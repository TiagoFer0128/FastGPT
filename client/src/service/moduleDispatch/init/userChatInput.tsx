import { SystemInputEnum } from '@/constants/app';
import type { ModuleDispatchProps } from '@/types/core/modules';

export type UserChatInputProps = ModuleDispatchProps<{
  [SystemInputEnum.userChatInput]: string;
}>;

export const dispatchChatInput = (props: Record<string, any>) => {
  const {
    inputs: { userChatInput }
  } = props as UserChatInputProps;
  return {
    userChatInput
  };
};
