from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def abhi():
    return {"data":{"abhiram":"21"}}

@app.get('/about')
def den():
    return "den"