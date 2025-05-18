Let's implement Authentication middleware for our functions/
The idea is to use Cloudflare KV to store the user data. Where key is the user name and the value is an object with different properties, including hashed password.
When user signes up - we should generate him a cryptographically strong and random UUID and save it in the KV value, along with hashed password. JWT should be set to HTTP only cookie.
When user logs in - we should check if the password is correct and issue the JTW with the UUID as a part of payload. Also payload should contain data that will allow tiered comparison:
Hashed first 16 bits of the IP,
Hashed user agent,
Timezone
Middleware should not only validate if JWT is valid, but also check for the IP, user agent and timezone match. If 2 of 3 factors are not matching - we should invalidate restrict access, and cookie should be deleted.
You should implement simple sign up and login pages as well
We do store tokens in .dev.vars, check .dev.vars.example and add there things that I have to add
Also, as a separate step - issue a cli command to create a CF KV namespace and add it to the .dev.vars (not reading it, but using cli tools)
I want you to create a STEP by step implementation plan, follow it step by step, mark completed steps before proceeding

