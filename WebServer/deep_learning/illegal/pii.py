import re
import spacy
from deep_learning.base_model import BaseModel

class PII():
    def __init__(self):
        self.re_match = {}
        self.re_match['身份证'] = r"(?<!\d)(\d{6}(19|20)?\d{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\d{3}[\dXx])(?!\d)"
        self.re_match['电话号码'] = r"(?<!\d)(1[3-9]\d{9})(?!\d)"
        self.re_match['旧版身份证'] = r'(?<!\d)[1-9]\d{7}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}(?!\d)'
        self.re_match['IPv4'] = r'(?<![\d])(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?![\d])'
        self.re_match['电子邮箱'] = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
        self.re_match['MAC'] = r'(?<![\d])(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}(?![\d])'
        self.re_match['座机号码'] = r'(?<!\d)(?:\(?0\d{2,3}\)?-?\d{7,8})(?!\d)'
        self.re_match['邮政编码'] =  r'(?<!\d)\d{6}(?!\d)'

       
        self.NER = spacy.load("zh_core_web_trf")
        self.NER_target = {'PERSON': '姓名', 'GPE': '地址' , 'LOC' : '地址','FAC' : '地址'}

        self.L1 = ['身份证','电话号码', '旧版身份证', '电子邮箱']
        self.L2 = ['IPv4', 'MAC', '邮政编码']
        self.L3 = ['姓名', '地址']

    @staticmethod
    def get_required_fields():
        return ['text']

    def find_re(self, text):
        re_res = {}
        for key in self.re_match.keys():
            regex = self.re_match[key]

            if key == '身份证':
                id_matches = [match[0] if isinstance(match, tuple) else match for match in re.finditer(regex, text)]
                values = [text[m.start():m.end()] for m in id_matches]
            else:
                values = re.findall(regex, text)
            
            re_res[key] = values

        return re_res
    
    def find_ner(self, text):
        doc = self.NER(text)
        entity_list = [(ent.label_, ent.text) for ent in doc.ents]
        entity_dict = {}

        for e in entity_list:
            if e[0] not in entity_dict.keys():
                entity_dict[e[0]] = []
           
            entity_dict[e[0]].append(e[1])
        
        res = {'姓名':[], '地址':[]}
        for target in self.NER_target.keys():
            if target in entity_dict.keys():
                # if self.NER_target[target] not in res.keys():
                #     res[self.NER_target[target]] = []
                res[self.NER_target[target]] += entity_dict[target]

        return res


    def predict(self, text):
        if isinstance(text, list) and all(isinstance(item, dict) and 'data' in item for item in text):
            texts = [item['text'] for item in text]
        else:
            texts = [text['text']]

        #texts = [text]
        res = []
        preds = []
        
        for text in texts:
            pred1 = 0
            pred2 = 0
            pred3 = 0
            res1 = self.find_re(text)
            res2 = self.find_ner(text)

            res1.update(res2)

            for key in self.L1:
                if len(res1[key]) != 0:
                    pred1 = 1
            for key in self.L2:
                if len(res1[key]) != 0:
                    pred2 = 1
            for key in self.L3:
                if len(res1[key]) != 0:
                    pred3 = 1
            
            res.append(res1)
            preds.append(pred1 or (pred2 and pred3))

        
        return {
            'data': preds,
            'status': 'success',
            'log':{'entities': res}
        }




if __name__ == "__main__":
    model = PII()

    text = (
    '张三住在上海市闵行区，在上海大学工作'
    '身份证号是310105199001011234，手机号是13800138000, '
    '登录IP是192.168.1.1，MAC为00:1A:2B:3C:4D:5E，邮箱是user.name+test@example.com。。'
    )
    #text = '佩罗西访问台湾'

    data = {
        'data':{'text': text}
    }

    print(model.predict(data))