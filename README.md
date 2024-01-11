# Follow this steps
- Create and Bind KV namespace

```
wrangler kv:namespace create WARP_RELEASE_KV

kv_namespaces = [
	 { binding = "WARP_RELEASE_KV", id = "xxxxx"}
]
```

- Bind send_email (Email Worker)

```
send_email = [
    {type = "send_email", name = "EMAIL_WORKER", destination_address = "you@example.com"},
]
```

- Put your secret variables

```
wrangler secret put SENDER
wrangler secret put RECIPIENT 
```

- Configure your cron trigger

```
# min hour day month weekdays (Cron Triggers execute on UTC time.)
# every day at 10 AM JST
[triggers]
crons = ["0 1 * * *"]
```