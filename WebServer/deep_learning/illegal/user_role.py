import pandas as pd

class User_role():
    def __init__(self):
        self.label_list = ['企业机构官方','大V/公众人物','一般创作者','一般用户']
    
    def predict(self, user):

        auth_type = user['auth_type']
        num_followers = user['num_followers']
        num_blogs = user['num_blogs']

        if auth_type == '蓝V':
            label = 0
        
        elif auth_type == '金V' and num_followers > 10000:
            label = 1
        
        elif auth_type == '金V':
            label = 2
        
        elif auth_type == '黄V' and num_followers > 1000:
            label = 2

        elif auth_type == '黄V':
            label = 3
        
        elif num_followers > 100000:
            label = 1
        
        elif num_followers > 20000:
            label = 2
        
        else:
            label = 3

        
        return {
            'data':self.label_list[label],
            'status': 'success'
        }
    
    def predict_online(self, user):
        """
        在线预测：根据用户的认证类型和粉丝数等信息打标签。
        如果字段为 None 或类型不符合预期，会使用默认值代替，避免抛异常。
        """

        # 1. 安全地获取字段并设置默认值
        auth_type = user.get('verified_reason') or ''       # 默认空字符串
        try:
            num_followers = int(user.get('followers') or 0) # 默认 0 并转为 int
        except (ValueError, TypeError):
            num_followers = 0
        try:
            num_blogs = int(user.get('weibo_num') or 0)     # 默认 0 并转为 int
        except (ValueError, TypeError):
            num_blogs = 0

        # 2. 业务逻辑判断
        # 注：label_list 里假设索引 0~3 对应不同角色名称
        if auth_type == '蓝V':
            label = 0
        elif auth_type == '金V':
            # 金V 用户：先看粉丝数
            label = 1 if num_followers > 10000 else 2
        elif auth_type == '黄V':
            # 黄V 用户：粉丝多于 1000 算更高等级
            label = 2 if num_followers > 1000 else 3
        else:
            # 非认证/普通用户：仅根据粉丝数区分
            if num_followers > 100000:
                label = 1
            elif num_followers > 20000:
                label = 2
            else:
                label = 3

        # 3. 返回结果
        return {
            'data': self.label_list[label],
            'status': 'success',
            'meta': {
                'auth_type': auth_type,
                'followers': num_followers,
                'weibo_num': num_blogs
            }
        }

    
    @staticmethod
    def get_required_fields():
        return ['username', 'num_followers', 'auth_type']
    
    def get_total_steps(self, path = '/webfile/test_data/user_role/test_user_role.csv'):
        df = pd.read_csv(path)
        return len(df)

    def test_model(self, path = '/webfile/test_data/user_role/test_user_role.csv'):
        df = pd.read_csv(path)
        step = 1
        preds = []
        labels = []
        for index, row in df.iterrows():
            username = row['username']
            num_followers = row['num_followers']
            num_blogs = row['num_blogs']
            auth_type = row['auth_type']
            label = row['label']

            pred = self.predict({'username':username, 'num_followers':num_followers, 'num_blogs':num_blogs, 'auth_type':auth_type})['data']
            
            step += 1
            yield step

            preds.append(self.label_list.index(pred))
            labels.append(self.label_list.index(label))
       
        yield (preds, labels)
        #return labels, preds
    

if __name__ == "__main__":
    model = User_role()
    labels, preds = model.test_model_step()

    from sklearn.metrics import accuracy_score, f1_score

    print(accuracy_score(labels, preds))
    print(f1_score(labels, preds, average='macro'))