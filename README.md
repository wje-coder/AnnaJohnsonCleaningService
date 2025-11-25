# AnnaJohnsonCleaningService
Building a full web stack that simulates a real cleaning service for Anna Johnson. The client creates accounts, submits cleaning requests with up to five photos at a time, receives and negotiates quotes, and then pays their bill. Anna has a login dashboard where she can manage clients, requests, orders, billing, and monthly reports.

# New Client Registeration
Clients can create an account that includes their name, email, phone number, address, and password. A new username is automatically generated for each client.
After registering, the client can submit a cleaning request using a service address. They can select the cleaning type (basic, move-out, deep cleaning), number of rooms, preferred date and time, budget, optional notes, and upload up to five photos.

# Login for exiting clients
Existing clients can view all open requests, quotes, and status updates. They can accept, decline, or negotiate a quote with a note.
Once the client accepts the order request, a fake billing system is used to simulate payment. The history of the interaction is saved for both the client and the admin. A saved credit card is used for paying the bill.
# Admin Dashboard
The admin login uses hard-coded credentials:
Username: anna_johnson
Password: 2001cleaningserviceAJ

The admin dashboard loads all clients with details such as the number of total jobs completed, on-time and late payments, open bills, last four digits of their saved card, and total amount currently due.
A search bar allows searching for clients by name, username, email, or address.

There is also a tab for all active service requests that have not yet been converted into orders. The admin can view request details including address, rooms, date and time, budget, notes, and photos.
The admin can take action by sending a quote (with price, estimated time, and admin note), accepting the request, or rejecting the request with a reason.

Once an order is accepted, it becomes an active order and is moved to the Ordering and Billing tab. It is removed from the requested-quote section.

The Reports section is separated by type and month. The report types include:
Frequent clients, Uncommitted clients, Accepted quotes for a given month, Prospective clients, Largest job, Overdue bills, Clients with overdue payments, Clients with no overdue payments, Filtering by month uses the <input type="month"> control.

# Frontend + Backend+ Database Structure
To create the frontend, an index.html to detectly call back the backend API. For the backend the node.js and express using mysql2 to connect pool. The use of multer to handle clients that need  to upload photos per their request. For passwords bcryptjs for hashing. As for the database MySQL/MariaDB was used with XAMPP and phpMyAdmin was use for tables. 

Each partner was able to build their ow websitie and we went over both to see if each perosn understood the process and understood how to explain each other work using extreme programing to explain each other work. Each student spent 40 hour working on the full stack web development.
