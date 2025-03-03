#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

"""
Domo Pipeline source to extract metadata
"""

from typing import Dict, Iterable, List, Optional

from metadata.clients.domo_client import DomoClient
from metadata.generated.schema.api.data.createPipeline import CreatePipelineRequest
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.pipeline import (
    PipelineStatus,
    StatusType,
    Task,
    TaskStatus,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.services.connections.pipeline.domopipelineConnection import (
    DomoPipelineConnection,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.type.entityReference import EntityReference
from metadata.ingestion.api.source import InvalidSourceException
from metadata.ingestion.models.pipeline_status import OMetaPipelineStatus
from metadata.ingestion.source.pipeline.dagster import STATUS_MAP
from metadata.ingestion.source.pipeline.pipeline_service import PipelineServiceSource


class DomopipelineSource(PipelineServiceSource):
    """
    Implements the necessary methods to extract
    Pipeline metadata from Domo's metadata db
    """

    config: WorkflowSource

    def __init__(self, config: WorkflowSource, metadata_config: OpenMetadataConnection):
        super().__init__(config, metadata_config)
        self.domo_client = self.connection.client
        self.client = DomoClient(self.service_connection)

    @classmethod
    def create(cls, config_dict, metadata_config: OpenMetadataConnection):
        config = WorkflowSource.parse_obj(config_dict)
        connection: DomoPipelineConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, DomoPipelineConnection):
            raise InvalidSourceException(
                f"Expected DomoPipelineConnection, but got {connection}"
            )
        return cls(config, metadata_config)

    def get_pipeline_name(self, pipeline_details) -> str:
        return pipeline_details["name"]

    def get_pipelines_list(self) -> Dict:
        results = self.client.get_pipelines()
        for result in results:
            yield result

    def yield_pipeline(self, pipeline_details) -> Iterable[CreatePipelineRequest]:
        task_list: List[Task] = []
        task = Task(
            name=pipeline_details["name"],
            displayName=pipeline_details["name"],
            description=pipeline_details.get("description", ""),
        )
        task_list.append(task)

        pipeline_yield = CreatePipelineRequest(
            name=pipeline_details["name"],
            description=pipeline_details.get("description", ""),
            tasks=task_list,
            service=EntityReference(
                id=self.context.pipeline_service.id.__root__, type="pipelineService"
            ),
            startDate=pipeline_details["created"],
        )
        yield pipeline_yield

    def yield_pipeline_lineage_details(
        self, pipeline_details
    ) -> Optional[Iterable[AddLineageRequest]]:
        return

    def yield_pipeline_status(self, pipeline_details) -> OMetaPipelineStatus:
        runs = self.client.get_runs(pipeline_details["id"])
        for run in runs:
            task_status = TaskStatus(
                name=pipeline_details["name"],
                executionStatus=STATUS_MAP.get(
                    run["state"].lower(), StatusType.Pending.value
                ),
                startTime=run["beginTime"] // 1000,
                endTime=run["endTime"] // 1000,
            )

            pipeline_status = PipelineStatus(
                taskStatus=[task_status],
                executionStatus=STATUS_MAP.get(
                    run["state"].lower(), StatusType.Pending.value
                ),
                timestamp=run["endTime"] // 1000,
            )

            yield OMetaPipelineStatus(
                pipeline_fqn=self.context.pipeline.fullyQualifiedName.__root__,
                pipeline_status=pipeline_status,
            )
