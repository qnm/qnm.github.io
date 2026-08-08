---
title: Mock Chop using PHP and Simpletest
date: '2007-06-18'
topic: archive
---

One of my reservations about adopting Unit Testing as a standard for my team was that, despite being pretty good developers, a fair amount of our code ends up being coupled. Recently I decided to dive in head-first to [Test Driven Development](http://en.wikipedia.org/wiki/Test-driven_development) (TDD to his friends) to see if building a greenfield project test-first would alleviate our tendency to couple code. Our shop develops in PHP, so the [Simpletest](http://www.lastcraft.com/simple_test.php) library was chosen to provide a Unit Test framework. Another developer and I sat down and coded the first few requirements of this new project, and successfully created a number of methods that could be unit-tested without requiring to be coupled to any other classes. The problem arose when implementing a facade. The method we' d written looked a little like this:

class Actionable\_JoinGroup
{

	function execute()
	{
		// do stuff to allow user to join group
		return GroupHelper::JoinGroup($this->\_userId, $this->\_groupId);
	}

}

As you can see, we've coupled the GroupHelper with the containing class, making it impossible to test the execute method without also invoking the JoinGroup method of the GroupHelper class. This is perfectly acceptable outside of testing, but causes no end of issues when outside classes are called from within unit tests. This can be avoided using by [Mock Objects](http://www.lastcraft.com/mock_objects_documentation.php):

Mock::Generate('GroupHelper');
$mockClass = new MockGroupHelper();

You can then call execute() on $mockClass without invoking the real method, but that still leaves the issue of coupling our abstraction with our helper. My solution was to create a member variable instance of the helper class and call it instead. We can use the constructor to populate the member variable with the required helper:

class Actionable\_JoinGroup
{
	var $\_helper;

	function Actionable\_JoinGroup()
	{
		// set a member variable to helper instance
		$this->\_helper = new GroupHelper();
	}

	function execute()
	{
		// do stuff to allow user to join group
		return $this->\_helper->JoinGroup($this->\_userId, $this->\_groupId);
	}

}

We can now inject our mock instance into the member variable inside unit tests, and check that all calls are made correctly without actually calling a method in an outside class:

class Actionable\_JoinGroupTest extends UnitTest
{
	function testJoinGroup()
	{
		$wrapperClass = new Actionable\_JoinGroup();

		// generate a mock to allow calling of helpers
		// without actually executing code
		Mock::generate('GroupHelper');

		// inject a mock instance
		$wrapperClass->\_helper = new MockGroupHelper();

		// set up your expectations here

		// ...and execute!
		$resultSet = $wrapperClass->execute();
	}
}

Discovering this concept has helped clear up many issues for me, and hopefully it'll help some else to become 'test-infected'.
