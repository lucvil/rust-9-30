import json
import random
import datetime 


def randomInt(max):
	return random.randrange(0,max)

json_open = open("record.json", "w")
data = {}

tdatetime = datetime.datetime.now() + datetime.timedelta(days=-499)
for i in range(500):
	data[tdatetime.strftime('%Y/%-m/%-d')] = randomInt(50)
	tdatetime += datetime.timedelta(days=+1)

json.dump(data, json_open, ensure_ascii=False, indent=4, separators=(',', ': '))
