/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { AxiosError } from 'axios';
import { EntityTags, ExtraInfo } from 'Models';
import React, {
  Fragment,
  RefObject,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { EntityField } from '../../constants/feed.constants';
import { observerOptions } from '../../constants/Mydata.constants';
import { EntityType } from '../../enums/entity.enum';
import { OwnerType } from '../../enums/user.enum';
import { Topic } from '../../generated/entity/data/topic';
import { ThreadType } from '../../generated/entity/feed/thread';
import { EntityReference } from '../../generated/type/entityReference';
import { Paging } from '../../generated/type/paging';
import { LabelType, State } from '../../generated/type/tagLabel';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import jsonData from '../../jsons/en';
import {
  getCurrentUserId,
  getEntityName,
  getEntityPlaceHolder,
  getOwnerValue,
} from '../../utils/CommonUtils';
import { getEntityFeedLink } from '../../utils/EntityUtils';
import { getDefaultValue } from '../../utils/FeedElementUtils';
import { getEntityFieldThreadCounts } from '../../utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { bytesToSize } from '../../utils/StringsUtils';
import { getTagsWithoutTier } from '../../utils/TableUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import ActivityFeedList from '../ActivityFeed/ActivityFeedList/ActivityFeedList';
import ActivityThreadPanel from '../ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../common/CustomPropertyTable/CustomPropertyTable';
import { CustomPropertyProps } from '../common/CustomPropertyTable/CustomPropertyTable.interface';
import Description from '../common/description/Description';
import EntityPageInfo from '../common/entityPageInfo/EntityPageInfo';
import TabsPane from '../common/TabsPane/TabsPane';
import PageContainer from '../containers/PageContainer';
import EntityLineageComponent from '../EntityLineage/EntityLineage.component';
import Loader from '../Loader/Loader';
import RequestDescriptionModal from '../Modals/RequestDescriptionModal/RequestDescriptionModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../PermissionProvider/PermissionProvider.interface';
import SampleDataTopic from '../SampleDataTopic/SampleDataTopic';
import SchemaEditor from '../schema-editor/SchemaEditor';
import { TopicDetailsProps } from './TopicDetails.interface';

const TopicDetails: React.FC<TopicDetailsProps> = ({
  topicDetails,
  partitions,
  cleanupPolicies,
  maximumMessageSize,
  replicationFactor,
  retentionSize,
  schemaText,
  schemaType,
  topicTags,
  activeTab,
  entityName,
  owner,
  description,
  tier,
  followers,
  slashedTopicName,
  setActiveTabHandler,
  settingsUpdateHandler,
  followTopicHandler,
  unfollowTopicHandler,
  descriptionUpdateHandler,
  tagUpdateHandler,
  version,
  versionHandler,
  deleted,
  entityThread,
  isentityThreadLoading,
  postFeedHandler,
  feedCount,
  entityFieldThreadCount,
  createThread,
  topicFQN,
  deletePostHandler,
  paging,
  fetchFeedHandler,
  isSampleDataLoading,
  sampleData,
  updateThreadHandler,
  entityFieldTaskCount,
  lineageTabData,
  onExtensionUpdate,
}: TopicDetailsProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [threadLink, setThreadLink] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [elementRef, isInView] = useInfiniteScroll(observerOptions);
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );

  const [topicPermissions, setTopicPermissions] = useState<OperationPermission>(
    DEFAULT_ENTITY_PERMISSION
  );

  const { getEntityPermission } = usePermissionProvider();

  const fetchResourcePermission = useCallback(async () => {
    try {
      const permissions = await getEntityPermission(
        ResourceEntity.TOPIC,
        topicDetails.id
      );
      setTopicPermissions(permissions);
    } catch (error) {
      showErrorToast(
        jsonData['api-error-messages']['fetch-entity-permissions-error']
      );
    }
  }, [topicDetails.id, getEntityPermission, setTopicPermissions]);

  useEffect(() => {
    if (topicDetails.id) {
      fetchResourcePermission();
    }
  }, [topicDetails.id]);

  const onEntityFieldSelect = (value: string) => {
    setSelectedField(value);
  };
  const closeRequestModal = () => {
    setSelectedField('');
  };

  const setFollowersData = (followers: Array<EntityReference>) => {
    setIsFollowing(
      followers.some(({ id }: { id: string }) => id === getCurrentUserId())
    );
    setFollowersCount(followers?.length);
  };

  const getConfigDetails = () => {
    return [
      { key: 'Partitions', value: `${partitions} partitions` },
      {
        key: 'Replication Factor',
        value: `${replicationFactor} replication factor`,
      },
      {
        key: 'Retention Size',
        value: `${bytesToSize(retentionSize)} retention size`,
      },
      {
        key: 'Clean-up Policies',
        value: `${cleanupPolicies.join(', ')} clean-up policies`,
      },
      {
        key: 'Max Message Size',
        value: `${bytesToSize(maximumMessageSize)} maximum size`,
      },
    ];
  };

  const getConfigObject = () => {
    return {
      Partitions: partitions,
      'Replication Factor': replicationFactor,
      'Retention Size': retentionSize,
      'CleanUp Policies': cleanupPolicies,
      'Max Message Size': maximumMessageSize,
    };
  };
  const tabs = [
    {
      name: 'Schema',
      icon: {
        alt: 'schema',
        name: 'icon-schema',
        title: 'Schema',
        selectedName: 'icon-schemacolor',
      },
      isProtected: false,
      position: 1,
    },
    {
      name: 'Activity Feeds & Tasks',
      icon: {
        alt: 'activity_feed',
        name: 'activity_feed',
        title: 'Activity Feed',
        selectedName: 'activity-feed-color',
      },
      isProtected: false,
      position: 2,
      count: feedCount,
    },
    {
      name: 'Sample Data',
      icon: {
        alt: 'sample_data',
        name: 'sample-data',
        title: 'Sample Data',
        selectedName: 'sample-data-color',
      },
      isProtected: false,
      position: 3,
    },
    {
      name: 'Config',
      icon: {
        alt: 'config',
        name: 'icon-config',
        title: 'Config',
        selectedName: 'icon-configcolor',
      },
      isProtected: false,
      position: 4,
    },
    {
      name: 'Lineage',
      icon: {
        alt: 'lineage',
        name: 'icon-lineage',
        title: 'Lineage',
        selectedName: 'icon-lineagecolor',
      },
      isProtected: false,
      position: 5,
    },
    {
      name: 'Custom Properties',
      isProtected: false,
      position: 6,
    },
  ];

  const extraInfo: Array<ExtraInfo> = [
    {
      key: 'Owner',
      value: getOwnerValue(owner),
      placeholderText: getEntityPlaceHolder(
        getEntityName(owner),
        owner?.deleted
      ),
      isLink: true,
      openInNewTab: false,
      profileName: owner?.type === OwnerType.USER ? owner?.name : undefined,
    },
    {
      key: 'Tier',
      value: tier?.tagFQN ? tier.tagFQN.split(FQN_SEPARATOR_CHAR)[1] : '',
    },
    ...getConfigDetails(),
  ];

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (description !== updatedHTML) {
      const updatedTopicDetails = {
        ...topicDetails,
        description: updatedHTML,
      };
      try {
        await descriptionUpdateHandler(updatedTopicDetails);
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setIsEdit(false);
      }
    } else {
      setIsEdit(false);
    }
  };
  const onOwnerUpdate = (newOwner?: Topic['owner']) => {
    if (newOwner) {
      const updatedTopicDetails = {
        ...topicDetails,
        owner: newOwner
          ? {
              ...topicDetails.owner,
              ...newOwner,
            }
          : topicDetails.owner,
      };
      settingsUpdateHandler(updatedTopicDetails);
    }
  };

  const onOwnerRemove = () => {
    if (topicDetails) {
      const updatedTopicDetails = {
        ...topicDetails,
        owner: undefined,
      };
      settingsUpdateHandler(updatedTopicDetails);
    }
  };

  const onTierRemove = () => {
    if (topicDetails) {
      const updatedTopicDetails = {
        ...topicDetails,
        tags: undefined,
      };
      settingsUpdateHandler(updatedTopicDetails);
    }
  };

  const onTierUpdate = (newTier?: string) => {
    if (newTier) {
      const tierTag: Topic['tags'] = newTier
        ? [
            ...getTagsWithoutTier(topicDetails.tags as Array<EntityTags>),
            {
              tagFQN: newTier,
              labelType: LabelType.Manual,
              state: State.Confirmed,
            },
          ]
        : topicDetails.tags;
      const updatedTopicDetails = {
        ...topicDetails,
        tags: tierTag,
      };

      return settingsUpdateHandler(updatedTopicDetails);
    } else {
      return Promise.reject();
    }
  };

  const followTopic = () => {
    if (isFollowing) {
      setFollowersCount((preValu) => preValu - 1);
      setIsFollowing(false);
      unfollowTopicHandler();
    } else {
      setFollowersCount((preValu) => preValu + 1);
      setIsFollowing(true);
      followTopicHandler();
    }
  };

  const getInfoBadge = (infos: Array<Record<string, string | number>>) => {
    return (
      <div className="tw-flex tw-justify-between">
        <div className="tw-flex tw-gap-3">
          {infos.map((info, index) => (
            <div className="tw-mt-4" key={index}>
              <span className="tw-py-1.5 tw-px-2 tw-rounded-l tw-bg-tag ">
                {info.key}
              </span>
              <span className="tw-py-1.5 tw-px-2 tw-bg-primary-lite tw-font-normal tw-rounded-r">
                {info.value}
              </span>
            </div>
          ))}
        </div>
        <div />
      </div>
    );
  };

  const onTagUpdate = (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTopic = { ...topicDetails, tags: updatedTags };
      tagUpdateHandler(updatedTopic);
    }
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };
  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const getLoader = () => {
    return isentityThreadLoading ? <Loader /> : null;
  };

  const fetchMoreThread = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      fetchFeedHandler(pagingObj.after);
    }
  };

  useEffect(() => {
    setFollowersData(followers);
  }, [followers]);

  useEffect(() => {
    fetchMoreThread(isInView as boolean, paging, isentityThreadLoading);
  }, [paging, isentityThreadLoading, isInView]);

  const handleFeedFilterChange = useCallback(
    (feedFilter, threadType) => {
      fetchFeedHandler(paging.after, feedFilter, threadType);
    },
    [paging]
  );

  return (
    <PageContainer>
      <div className="tw-px-6 tw-w-full tw-h-full tw-flex tw-flex-col">
        <EntityPageInfo
          canDelete={topicPermissions.Delete}
          currentOwner={topicDetails.owner}
          deleted={deleted}
          entityFieldTasks={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldTaskCount
          )}
          entityFieldThreads={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldThreadCount
          )}
          entityFqn={topicFQN}
          entityId={topicDetails.id}
          entityName={entityName}
          entityType={EntityType.TOPIC}
          extraInfo={extraInfo}
          followHandler={followTopic}
          followers={followersCount}
          followersList={followers}
          isFollowing={isFollowing}
          isTagEditable={topicPermissions.EditAll || topicPermissions.EditTags}
          removeOwner={
            topicPermissions.EditAll || topicPermissions.EditOwner
              ? onOwnerRemove
              : undefined
          }
          removeTier={
            topicPermissions.EditAll || topicPermissions.EditTier
              ? onTierRemove
              : undefined
          }
          tags={topicTags}
          tagsHandler={onTagUpdate}
          tier={tier ?? ''}
          titleLinks={slashedTopicName}
          updateOwner={
            topicPermissions.EditAll || topicPermissions.EditOwner
              ? onOwnerUpdate
              : undefined
          }
          updateTier={
            topicPermissions.EditAll || topicPermissions.EditTier
              ? onTierUpdate
              : undefined
          }
          version={version}
          versionHandler={versionHandler}
          onThreadLinkSelect={onThreadLinkSelect}
        />
        <div className="tw-mt-4 tw-flex tw-flex-col tw-flex-grow">
          <TabsPane
            activeTab={activeTab}
            setActiveTab={setActiveTabHandler}
            tabs={tabs}
          />
          <div className="tw-flex-grow tw-flex tw-flex-col tw--mx-6 tw-px-7 tw-py-4">
            <div className="tw-bg-white tw-flex-grow tw-p-4 tw-shadow tw-rounded-md">
              {activeTab === 1 && (
                <>
                  <div className="tw-grid tw-grid-cols-4 tw-gap-4 tw-w-full">
                    <div className="tw-col-span-full tw--ml-5">
                      <Description
                        description={description}
                        entityFieldTasks={getEntityFieldThreadCounts(
                          EntityField.DESCRIPTION,
                          entityFieldTaskCount
                        )}
                        entityFieldThreads={getEntityFieldThreadCounts(
                          EntityField.DESCRIPTION,
                          entityFieldThreadCount
                        )}
                        entityFqn={topicFQN}
                        entityName={entityName}
                        entityType={EntityType.TOPIC}
                        hasEditAccess={
                          topicPermissions.EditAll ||
                          topicPermissions.EditDescription
                        }
                        isEdit={isEdit}
                        isReadOnly={deleted}
                        owner={owner}
                        onCancel={onCancel}
                        onDescriptionEdit={onDescriptionEdit}
                        onDescriptionUpdate={onDescriptionUpdate}
                        onEntityFieldSelect={onEntityFieldSelect}
                        onThreadLinkSelect={onThreadLinkSelect}
                      />
                    </div>
                  </div>
                  {schemaText ? (
                    <Fragment>
                      {getInfoBadge([{ key: 'Schema', value: schemaType }])}
                      <div
                        className="tw-my-4 tw-border tw-border-main tw-rounded-md tw-py-4"
                        data-testid="schema">
                        <SchemaEditor value={schemaText} />
                      </div>
                    </Fragment>
                  ) : (
                    <div className="tw-flex tw-justify-center tw-font-medium tw-items-center tw-border tw-border-main tw-rounded-md tw-p-8">
                      No schema data available
                    </div>
                  )}
                </>
              )}
              {activeTab === 2 && (
                <div
                  className="tw-py-4 tw-px-7 tw-grid tw-grid-cols-3 entity-feed-list tw--mx-7 tw--my-4 "
                  id="activityfeed">
                  <div />
                  <ActivityFeedList
                    isEntityFeed
                    withSidePanel
                    className=""
                    deletePostHandler={deletePostHandler}
                    entityName={entityName}
                    feedList={entityThread}
                    postFeedHandler={postFeedHandler}
                    updateThreadHandler={updateThreadHandler}
                    onFeedFiltersUpdate={handleFeedFilterChange}
                  />
                  <div />
                </div>
              )}
              {activeTab === 3 && (
                <div data-testid="sample-data">
                  <SampleDataTopic
                    isLoading={isSampleDataLoading}
                    sampleData={sampleData}
                  />
                </div>
              )}
              {activeTab === 4 && (
                <div data-testid="config">
                  <SchemaEditor value={JSON.stringify(getConfigObject())} />
                </div>
              )}
              {activeTab === 5 && (
                <div
                  className="tw-px-2 tw-h-full"
                  data-testid="lineage-details">
                  <EntityLineageComponent
                    addLineageHandler={lineageTabData.addLineageHandler}
                    deleted={deleted}
                    entityLineage={lineageTabData.entityLineage}
                    entityLineageHandler={lineageTabData.entityLineageHandler}
                    entityType={EntityType.TOPIC}
                    hasEditAccess={
                      topicPermissions.EditAll || topicPermissions.EditLineage
                    }
                    isLoading={lineageTabData.isLineageLoading}
                    isNodeLoading={lineageTabData.isNodeLoading}
                    lineageLeafNodes={lineageTabData.lineageLeafNodes}
                    loadNodeHandler={lineageTabData.loadNodeHandler}
                    removeLineageHandler={lineageTabData.removeLineageHandler}
                  />
                </div>
              )}
              {activeTab === 6 && (
                <CustomPropertyTable
                  entityDetails={
                    topicDetails as CustomPropertyProps['entityDetails']
                  }
                  entityType={EntityType.TOPIC}
                  handleExtentionUpdate={onExtensionUpdate}
                />
              )}
              <div
                data-testid="observer-element"
                id="observer-element"
                ref={elementRef as RefObject<HTMLDivElement>}>
                {getLoader()}
              </div>
            </div>
          </div>
          {threadLink ? (
            <ActivityThreadPanel
              createThread={createThread}
              deletePostHandler={deletePostHandler}
              open={Boolean(threadLink)}
              postFeedHandler={postFeedHandler}
              threadLink={threadLink}
              threadType={threadType}
              updateThreadHandler={updateThreadHandler}
              onCancel={onThreadPanelClose}
            />
          ) : null}
          {selectedField ? (
            <RequestDescriptionModal
              createThread={createThread}
              defaultValue={getDefaultValue(owner as EntityReference)}
              header="Request description"
              threadLink={getEntityFeedLink(
                EntityType.TOPIC,
                topicFQN,
                selectedField
              )}
              onCancel={closeRequestModal}
            />
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
};

export default TopicDetails;
