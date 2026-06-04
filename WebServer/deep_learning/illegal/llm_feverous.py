from deep_learning.illegal.llm import LLM_agent
import json
import random
from sklearn.metrics import f1_score, accuracy_score,recall_score

random.seed(666)
llm = LLM_agent()


with open('../../my_test/feverous.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

prompt = (
    'Here is a claim and its relevant evidence, determine whether the evidence supports or refutes the claim.\n'
    'Please avoid ambiguous answers and response 0 if evidence supports the claim and 1 if evidence refutes the claim.\n'
    'Response with 0 or 1 directly.\n'
)

random.shuffle(data)


true_labels = []
pred_labels = []
for i in range(1):
    claim = data[i]['claim']
    evidence = data[i]['evidence']
    label = data[i]['label']
    if label == 'supports':
        label = 0
    else:
        label = 1

    try:
        response = llm.get_response(prompt + f'Claim: {claim}\n' + f'Evidence: {evidence}\n')
    except:
        response = "error"

    print(response)
    pred = 0
    if response == "error" or ('1' not in response and '0' not in response):
        tmp = random.randint(1,2)
        if tmp == 1:
            pred = 0
        if tmp == 2:
            pred = 1
    
    if '1' in response:
        pred = 1
    
    if '0' in response:
        pred = 0

    true_labels.append(label)
    pred_labels.append(pred)

print("-----Test-----")
print("Split: ", [true_labels.count(i) for i in set(true_labels)])
print("ACC: ", accuracy_score(true_labels, pred_labels))
print("F1: ", f1_score(true_labels, pred_labels, average='macro'))
print("Recall: ", recall_score(true_labels, pred_labels, average='macro'))
print("分别F1: ", f1_score(true_labels, pred_labels, average=None))
print("分别Recall: ", recall_score(true_labels, pred_labels, average=None))
print("-----Over------")


