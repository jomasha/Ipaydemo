# IPAY

RELEASE 0.0.1

# Particulars

- The system default port is 9999
- The default path is http://localhost:9999
- The call back url is /mpesaCallBack. The full url is http://localhost:9999/mpesaCallBack

## Up & Running

- you will need to install nodejs to be able to run the program
- The UI will have an auto filled form that gives you the access to the back end and the various responses.
- Have included a database that will contain the data store for the records.

## Responses

- The responses from the IPay API have only logged it.
- Due to time constraints more improvements could be added.
- To search for transaction just hit the url http:localhost:9999/searchTransaction with get key transaction_ref which is the transaction refference of the transaction.
- You can use the api in mpesa.http to simulate requests.
