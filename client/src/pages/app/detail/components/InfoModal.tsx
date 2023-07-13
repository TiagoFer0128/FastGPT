import React, { useState, useCallback } from 'react';
import {
  Box,
  Flex,
  Button,
  FormControl,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { AppSchema } from '@/types/mongoSchema';
import { useToast } from '@/hooks/useToast';
import { delModelById, putAppById } from '@/api/app';
import { useSelectFile } from '@/hooks/useSelectFile';
import { compressImg } from '@/utils/file';
import { getErrText } from '@/utils/tools';
import Avatar from '@/components/Avatar';

const InfoModal = ({
  defaultApp,
  onClose,
  onSuccess
}: {
  defaultApp: AppSchema;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();
  const { File, onOpen: onOpenSelectFile } = useSelectFile({
    fileType: '.jpg,.png',
    multiple: false
  });
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    reset,
    handleSubmit
  } = useForm({
    defaultValues: defaultApp
  });
  const [btnLoading, setBtnLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  // 提交保存模型修改
  const saveSubmitSuccess = useCallback(
    async (data: AppSchema) => {
      setBtnLoading(true);
      try {
        await putAppById(data._id, {
          name: data.name,
          avatar: data.avatar,
          intro: data.intro,
          chat: data.chat,
          share: data.share
        });
      } catch (err: any) {
        toast({
          title: err?.message || '更新失败',
          status: 'error'
        });
      }
      setBtnLoading(false);
    },
    [toast]
  );
  // 提交保存表单失败
  const saveSubmitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj) return '提交表单错误';
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };
    toast({
      title: deepSearch(errors),
      status: 'error',
      duration: 4000,
      isClosable: true
    });
  }, [errors, toast]);

  const saveUpdateModel = useCallback(
    () => handleSubmit(saveSubmitSuccess, saveSubmitError)(),
    [handleSubmit, saveSubmitError, saveSubmitSuccess]
  );

  const onSelectFile = useCallback(
    async (e: File[]) => {
      const file = e[0];
      if (!file) return;
      try {
        const src = await compressImg({
          file,
          maxW: 100,
          maxH: 100
        });
        setValue('avatar', src);
        setRefresh((state) => !state);
      } catch (err: any) {
        toast({
          title: getErrText(err, '头像选择异常'),
          status: 'warning'
        });
      }
    },
    [setValue, toast]
  );

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent maxW={'min(90vw,470px)'}>
        <ModalHeader>应用信息设置</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box>头像 & 名称</Box>
          <Flex mt={2} alignItems={'center'}>
            <Avatar
              src={getValues('avatar')}
              w={['26px', '34px']}
              h={['26px', '34px']}
              cursor={'pointer'}
              borderRadius={'lg'}
              mr={4}
              title={'点击切换头像'}
              onClick={() => onOpenSelectFile()}
            />
            <FormControl>
              <Input
                bg={'myWhite.600'}
                placeholder={'给应用设置一个名称'}
                {...register('name', {
                  required: '展示名称不能为空'
                })}
              ></Input>
            </FormControl>
          </Flex>
          <Box mt={6} mb={1}>
            应用介绍
          </Box>
          <Box color={'myGray.500'} mb={2} fontSize={'sm'}>
            该介绍主要用于记忆和在应用市场展示
          </Box>
          <Textarea
            rows={4}
            maxLength={500}
            placeholder={'给你的 AI 应用一个介绍'}
            bg={'myWhite.600'}
            {...register('intro')}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant={'base'} mr={3} onClick={onClose}>
            取消
          </Button>
          <Button
            isLoading={btnLoading}
            onClick={async () => {
              try {
                await saveUpdateModel();
                onSuccess();
                onClose();
                toast({
                  title: '更新成功',
                  status: 'success'
                });
              } catch (error) {
                console.log(error);
              }
            }}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>

      <File onSelect={onSelectFile} />
    </Modal>
  );
};

export default InfoModal;
