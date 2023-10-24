import React, { useCallback, useState, useRef, useMemo } from 'react';
import { Box, Card, IconButton, Flex, Grid, Image, Button } from '@chakra-ui/react';
import { usePagination } from '@/web/common/hooks/usePagination';
import {
  getDatasetDataList,
  delOneDatasetDataById,
  getDatasetCollectionById
} from '@/web/core/dataset/api';
import { DeleteIcon } from '@chakra-ui/icons';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/web/common/hooks/useToast';
import { debounce } from 'lodash';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useConfirm } from '@/web/common/hooks/useConfirm';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';
import MyInput from '@/components/MyInput';
import { useLoading } from '@/web/common/hooks/useLoading';
import { getCollectionIcon } from '@fastgpt/global/core/dataset/utils';
import InputDataModal, { RawSourceText, type InputDataType } from '../components/InputDataModal';
import type { DatasetDataListItemType } from '@/global/core/dataset/response.d';
import { TabEnum } from '..';

const DataCard = () => {
  const BoxRef = useRef<HTMLDivElement>(null);
  const lastSearch = useRef('');
  const router = useRouter();
  const { collectionId = '' } = router.query as { collectionId: string };
  const { Loading, setIsLoading } = useLoading({ defaultLoading: true });
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { openConfirm, ConfirmModal } = useConfirm({
    content: t('dataset.Confirm to delete the data')
  });

  const {
    data: datasetDataList,
    Pagination,
    total,
    getData,
    pageNum,
    pageSize
  } = usePagination<DatasetDataListItemType>({
    api: getDatasetDataList,
    pageSize: 24,
    params: {
      collectionId,
      searchText
    },
    onChange() {
      setIsLoading(false);
      if (BoxRef.current) {
        BoxRef.current.scrollTop = 0;
      }
    }
  });

  const [editInputData, setEditInputData] = useState<InputDataType>();

  // get first page data
  const getFirstData = useCallback(
    debounce(() => {
      getData(1);
      lastSearch.current = searchText;
    }, 300),
    []
  );

  // get file info
  const { data: collection } = useQuery(['getDatasetCollectionById', collectionId], () =>
    getDatasetCollectionById(collectionId)
  );
  const fileIcon = useMemo(
    () => getCollectionIcon(collection?.type, collection?.name),
    [collection?.name, collection?.type]
  );

  return (
    <Box ref={BoxRef} position={'relative'} px={5} py={[1, 5]} h={'100%'} overflow={'overlay'}>
      <Flex alignItems={'center'}>
        <IconButton
          mr={3}
          icon={<MyIcon name={'backFill'} w={['14px', '18px']} color={'myBlue.600'} />}
          bg={'white'}
          boxShadow={'1px 1px 9px rgba(0,0,0,0.15)'}
          size={'sm'}
          borderRadius={'50%'}
          aria-label={''}
          onClick={() =>
            router.replace({
              query: {
                datasetId: router.query.datasetId,
                parentId: router.query.parentId,
                currentTab: TabEnum.collectionCard
              }
            })
          }
        />
        <Flex className="textEllipsis" flex={'1 0 0'} mr={[3, 5]} alignItems={'center'}>
          <Image src={fileIcon || '/imgs/files/file.svg'} w={['16px', '18px']} mr={2} alt={''} />

          <Box lineHeight={1.2}>
            <RawSourceText
              sourceName={collection?.name}
              sourceId={collection?.metadata?.fileId || collection?.metadata?.rawLink}
              fontSize={['md', 'lg']}
              color={'black'}
              textDecoration={'none'}
            />
            <Box fontSize={'sm'} color={'myGray.500'}>
              文件ID:{' '}
              <Box as={'span'} userSelect={'all'}>
                {collection?._id}
              </Box>
            </Box>
          </Box>
        </Flex>
        <Box>
          <Button
            ml={2}
            variant={'base'}
            size={['sm', 'md']}
            onClick={() => {
              if (!collection) return;
              setEditInputData({
                datasetId: collection.datasetId,
                collectionId: collection._id,
                sourceId: collection.metadata?.fileId || collection.metadata?.rawLink,
                sourceName: collection.name
              });
            }}
          >
            {t('dataset.Insert Data')}
          </Button>
        </Box>
      </Flex>
      <Flex my={3} alignItems={'center'}>
        <Box>
          <Box as={'span'} fontSize={['md', 'lg']}>
            {total}组
          </Box>
        </Box>
        <Box flex={1} mr={1} />
        <MyInput
          leftIcon={
            <MyIcon name="searchLight" position={'absolute'} w={'14px'} color={'myGray.500'} />
          }
          w={['200px', '300px']}
          placeholder="根据匹配知识，预期答案和来源进行搜索"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            getFirstData();
          }}
          onBlur={() => {
            if (searchText === lastSearch.current) return;
            getFirstData();
          }}
          onKeyDown={(e) => {
            if (searchText === lastSearch.current) return;
            if (e.key === 'Enter') {
              getFirstData();
            }
          }}
        />
      </Flex>
      <Grid
        minH={'100px'}
        gridTemplateColumns={['1fr', 'repeat(2,1fr)', 'repeat(3,1fr)']}
        gridGap={4}
      >
        {datasetDataList.map((item) => (
          <Card
            key={item.id}
            cursor={'pointer'}
            pt={3}
            userSelect={'none'}
            boxShadow={'none'}
            _hover={{ boxShadow: 'lg', '& .delete': { display: 'flex' } }}
            border={'1px solid '}
            borderColor={'myGray.200'}
            onClick={() => {
              if (!collection) return;
              setEditInputData({
                id: item.id,
                datasetId: collection.datasetId,
                collectionId: collection._id,
                q: item.q,
                a: item.a,
                sourceId: collection.metadata?.fileId || collection.metadata?.rawLink,
                sourceName: collection.name
              });
            }}
          >
            <Box
              h={'95px'}
              overflow={'hidden'}
              wordBreak={'break-all'}
              px={3}
              py={1}
              fontSize={'13px'}
            >
              <Box color={'myGray.1000'} mb={2}>
                {item.q}
              </Box>
              <Box color={'myGray.600'}>{item.a}</Box>
            </Box>
            <Flex py={2} px={4} h={'36px'} alignItems={'flex-end'} fontSize={'sm'}>
              <Box className={'textEllipsis'} flex={1} color={'myGray.500'}>
                ID:{item.id}
              </Box>
              <IconButton
                className="delete"
                display={['flex', 'none']}
                icon={<DeleteIcon />}
                variant={'base'}
                colorScheme={'gray'}
                aria-label={'delete'}
                size={'xs'}
                borderRadius={'md'}
                _hover={{ color: 'red.600' }}
                isLoading={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  openConfirm(async () => {
                    try {
                      setIsDeleting(true);
                      await delOneDatasetDataById(item.id);
                      getData(pageNum);
                    } catch (error) {
                      toast({
                        title: getErrText(error),
                        status: 'error'
                      });
                    }
                    setIsDeleting(false);
                  })();
                }}
              />
            </Flex>
          </Card>
        ))}
      </Grid>

      {total > pageSize && (
        <Flex mt={2} justifyContent={'center'}>
          <Pagination />
        </Flex>
      )}
      {total === 0 && (
        <Flex flexDirection={'column'} alignItems={'center'} pt={'10vh'}>
          <MyIcon name="empty" w={'48px'} h={'48px'} color={'transparent'} />
          <Box mt={2} color={'myGray.500'}>
            知识库空空如也
          </Box>
        </Flex>
      )}

      {editInputData !== undefined && collection && (
        <InputDataModal
          datasetId={collection.datasetId}
          defaultValues={editInputData}
          onClose={() => setEditInputData(undefined)}
          onSuccess={() => getData(pageNum)}
        />
      )}
      <ConfirmModal />
      <Loading fixed={false} />
    </Box>
  );
};

export default React.memo(DataCard);
