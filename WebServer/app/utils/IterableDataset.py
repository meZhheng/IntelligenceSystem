import torch
from torch.utils.data import IterableDataset, DataLoader
from sqlalchemy.orm import scoped_session, sessionmaker

class IterableDataset(IterableDataset):
    def __init__(self, session_factory, dataset_class, dataset_id: int, required_fields):
        """
        Args:
            session_factory: SQLAlchemy 的 sessionmaker/scoped_session，不直接传 Session 实例
            dataset_id: 数据集 ID
            tokenizer: 文本 tokenizer
        """
        self.session_factory = session_factory
        self.dataset_class = dataset_class
        self.dataset_id = dataset_id
        self.required_fields = required_fields

        # 在初始化时就查一次总数，存下来
        session = self.session_factory()
        self._total_samples = (
            session.query(self.dataset_class)
                   .filter_by(dataset_id=self.dataset_id)
                   .count()
        )
        # session.close()

    def __iter__(self):
        session = self.session_factory()
        try:
            query = (
                session.query(self.dataset_class)
                    .filter_by(dataset_id=self.dataset_id)
                    .limit(1000)                           
                    .execution_options(stream_results=True)
                    .all()
            )
            for row in query:
                data = row.to_dict()
                record = {}
                skip = False
                for field in self.required_fields:
                    value = data.get(field)
                    if value is None:
                        skip = True
                        break
                    record[field] = value
                if skip:
                    continue
                yield record
        finally:
            pass
            # session.close()


    def __len__(self):
        return self._total_samples