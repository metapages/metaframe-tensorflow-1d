Goal: train 1D convnet models with arbitrary inputs
Create a metaframe, wow this would be super useful.

InputsV3:

```
    {
        "training_examples": [
            {
                "name": "some identifier, can be timestamp, ignored",
                "label": "swoop",
                "data": { ["key"]: string | Float32Array } 
            },
            {
                "label": "swazzle",
                "name": "some identifier, can be timestamp",
                "data": { ["key"]: string | Float32Array } 
            },
        ]
    }
```



InputsV2:
 - labels will be extracted, so no need to create a list
 - streams must all be the same (ax, ay, az etc) 
   - if any example has missing streams

 



```
    {
        "training_examples": {
            "streams": ["ax", "ay", "az", "gx", "gy", "gz"],
            "labels": ["_", "swoop", "swazzle"],
            "data": [
                {
                    "name": "some identifier, can be timestamp, ignored",
                    "label": "swoop",
                    "data": { ["key"]: string | Float32Array } 
                },
                {
                    "label": "swazzle",
                    "name": "some identifier, can be timestamp",
                    "data": { ["key"]: string | Float32Array } 
                },
            ]
        }
    }
```


Inputs:
```
    {
        "training": {
            "data": [
                {
                    "name": "some identifier, can be timestamp",
                    "label": "label1",
                    "dimensions": [x, y],            
                    "encoding": "base64",
                    "data": "dsfsdfsdf"
                },
                {
                    "label": "label2",
                    "dimensions": [x, y],            
                    "encoding": "base64",
                    "url": "https://where.is.my.data/xzy"
                },
                {
                    "label": "label1",
                    "name": "some identifier, can be timestamp",
                    "dimensions": [x, y],            
                    "encoding": "json",
                    "data": [ [1,2,3], [1,2,3] ]
                },
            ]
        }
    }
```




For now just use arrays :/

Inputs: 