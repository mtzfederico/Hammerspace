package main

import (
	"testing"
)

// Run the tests using the command go test
// and run the tests and the benchmarks with go test -bench=.

func TestIsUserIDValid(t *testing.T) {
	items := map[string]bool{"bob": false, "1234": false, "12345": true, "myUser0": true, "sample_user": true, "john.doe": true, "noobMaster69": true, "first-last": true, "user@name": false, "user;name": false, "user,name": false, "😀": false, "aioh 😀": false, "thisUsernameIsWayTooLong": false}

	for key, value := range items {
		result := isUserIDValid(key)
		if result != value {
			t.Errorf("isUserIDValid failed for value %s. Expected: %t got: %t", key, value, result)
		}
	}
}

func BenchmarkIsUserIDValid(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = isUserIDValid("sample_user")
	}
}

func TestIsEmailValid(t *testing.T) {
	items := map[string]bool{"me@example.com": true, "hello.world@example.com": true, "defenitelyNotAnEmail.com": false, "@username": false, "": false, "noobMaster69": false, "first-last": false, "user;name": false}

	for key, value := range items {
		result := isEmailValid(key)
		if result != value {
			t.Errorf("isEmailValid failed for value '%s'. Expected: %t got: %t", key, value, result)
		}
	}
}

func BenchmarkIsEmailValid(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = isEmailValid("hello.world@example.com")
	}
}

func TestIsValidPassword(t *testing.T) {
	items := map[string]bool{"": false, "hello.world@example.com": true, "123": false, "a123": false, "a": false, "correctHorseBatteryStaple": true, "abcde": true, "EvVx7*$4YsD0M$97kEY@*TU8F@F@5%": true, "S7WT0N8ezNDbPO9b$JT8u*AKgVR4!hK*3$I": false, "Jockey-Each-Plaza5-Ecology": true}

	for key, value := range items {
		result := isValidPassword(key)
		if result != value {
			t.Errorf("isValidPassword failed for value '%s'. Expected: %t got: %t", key, value, result)
		}
	}
}

func BenchmarkIsValidPassword(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = isValidPassword("correctHorseBatteryStaple")
	}
}
