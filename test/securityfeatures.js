const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../express_server.js'); // replace '../your_app' with the path to your app
const expect = chai.expect;

chai.use(chaiHttp);

describe('Login and Access URL', function() {
  let agent; // for storing cookies

  before(function() {
    agent = chai.request.agent('http://localhost:8080'); // create agent to persist cookies
  });

  it('should login successfully and access URL with status code 403', function() {
    // Login with user2@example.com credentials
    return agent
      .post('/login')
      .send({ email: 'user@example.com', password: 'purple-monkey-dinosaur' })
      .then(function(res) {
        expect(res).to.have.status(200); // Check if login was successful
        // Access the URL with the session cookie
        return agent.get('/urls/s9m5xK');
      })
      .then(function(res) {
        expect(res).to.have.status(403); // Check if access is forbidden
      });
  });

  it('should redirect to /login if user is not logged in when accessing /', function() {
    return chai.request(app)
      .get('/').redirects(0)
      .then(function(res) {
        // Check if the Location header redirects to /login
        expect(res).to.redirectTo('/login');
      });
  });

  it('should redirect to /login if user is not logged in when accessing /urls/new', function() {
    return chai.request(app)
      .get('/urls/new').redirects(0)
      .then(function(res) {
        // Check if the response status code is 401 Unauthorized
        expect(res).to.redirectTo('/login');
      });
  });

  it('should return 401 Unauthorized if user is not logged in when accesing /urls/:id', function() {
    return chai.request(app)
      .get('/urls/b2xVn2') // Replace 'b2xVn2' with a valid URL ID
      .then(function(res) {
        // Check if the response status code is 401 Unauthorized
        expect(res).to.have.status(401);
      });
  });

  it('should return an error message if the URL does not exist', function() {
    // Simulate user login by setting a session cookie
    const agent = chai.request.agent(app);
    return agent
      .post('/login')
      .send({ email: 'user@example.com', password: 'purple-monkey-dinosaur' })
      .then(function(res) {
        // Check if the login was successful
        expect(res).to.have.status(200);

        // Now make a GET request to a non-existent URL
        return agent.get('/urls/nonexistent-url'); // Replace 'nonexistent-url' with a URL that doesn't exist
      })
      .then(function(res) {
        // Check if the response status code is 404 Not Found
        expect(res).to.have.status(404);
      });
  });

  it('should return an error message if the user does not own the URL', function() {
    // Simulate user login by setting a session cookie
    const agent = chai.request.agent(app);
    return agent
      .post('/login')
      .send({ email: 'user@example.com', password: 'purple-monkey-dinosaur' })
      .then(function(res) {
        // Check if the login was successful
        expect(res).to.have.status(200);

        // Now make a GET request to a URL that the user does not own
        return agent.get('/urls/s7n6yl'); // Replace 's7n6yl' with the URL ID
      })
      .then(function(res) {
        // Check if the response status code is 403 Forbidden
        expect(res).to.have.status(403);
      });
  });
  
  after(function() {
    // Cleanup: Close agent to release resources
    agent.close();
  });
});