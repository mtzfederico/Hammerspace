package main

import (
	"testing"
)

// Run the tests using the command go test

func TestIsUserIDValid(t *testing.T) {
	items := map[string]bool{"bob": false, "1234": false, "12345": true, "myUser0": true, "sample_user": true, "john.doe": true, "noobMaster69": true, "first-last": true, "user@name": false, "user;name": false, "user,name": false, "😀": false, "aioh 😀": false, "thisUsernameIsWayTooLong": false}

	for key, value := range items {
		result := isUserIDValid(key)
		if result != value {
			t.Errorf("isUserIDValid failed for value %s. Expected: %t got: %t", key, value, result)
		}
	}
}

func TestIsEmailValid(t *testing.T) {
	items := map[string]bool{"me@example.com": true, "defenitelyNotAnEmail.com": false, "@username": false, "": false, "noobMaster69": false, "first-last": false, "user;name": false}

	for key, value := range items {
		result := isEmailValid(key)
		if result != value {
			t.Errorf("isEmailValid failed for value %s. Expected: %t got: %t", key, value, result)
		}
	}
}
