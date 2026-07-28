built the “update my profile” feature (PATCH /api/v1/users/me).

A logged-in user can update their own name, profile picture, and contact details.

The route only sends the request to the controller.
The controller gets the user ID from login and sends data to the service.
The service makes sure only allowed fields are updated and validates the data.
The repository updates only the given fields in the database safely.
Tests check that everything works and that users cannot change protected fields like role or banned status.
