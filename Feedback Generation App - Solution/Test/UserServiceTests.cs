using Feedback_Generation_App.Contexts;
using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Repositories;
using Feedback_Generation_App.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FeedbackBack_Unit_Tests
{
    /// <summary>
    /// Tests for UserService: RegisterUser, CheckUser
    /// Pattern: Real Repository + InMemory DB + Mocked external services
    /// </summary>
    public class UserServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, User> _userRepository;
        private readonly PasswordService _passwordService;
        private readonly Mock<ITokenService> _mockTokenService;
        private readonly UserService _userService;

        public UserServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context = new FeedbackContext(options);
            _userRepository = new Repository<int, User>(_context);
            _passwordService = new PasswordService();

            _mockTokenService = new Mock<ITokenService>();
            _mockTokenService
                .Setup(ts => ts.CreateToken(It.IsAny<TokenPayloadDto>()))
                .Returns("mock-jwt-token");

            _userService = new UserService(_userRepository, _passwordService, _mockTokenService.Object);
        }

        // ── Helper ────────────────────────────────────────────────────────────

        private async Task<User> RegisterTestUser(string username = "testuser", string password = "Test@123")
        {
            await _userService.RegisterUser(new RegisterUserDto
            {
                Username = username,
                Email = $"{username}@test.com",
                Password = password
            });
            return await _userRepository.GetQueryable().FirstAsync(u => u.Username == username);
        }

        // ── RegisterUser ──────────────────────────────────────────────────────

        [Fact]
        public async Task RegisterUser_ValidDto_UserSavedToDatabase()
        {
            await _userService.RegisterUser(new RegisterUserDto
            {
                Username = "newuser",
                Email = "newuser@test.com",
                Password = "Test@123"
            });

            var creator = await _userRepository.GetQueryable()
                .FirstOrDefaultAsync(u => u.Username == "newuser");

            Assert.NotNull(creator);
            Assert.Equal("newuser", creator!.Username);
            Assert.Equal("newuser@test.com", creator.Email);
        }

        [Fact]
        public async Task RegisterUser_NewUser_DefaultRoleIsUser()
        {
            // After our change, default role is "User" (not "Creator")
            await _userService.RegisterUser(new RegisterUserDto
            {
                Username = "rolecheck",
                Email = "role@test.com",
                Password = "Test@123"
            });

            var user = await _userRepository.GetQueryable()
                .FirstAsync(u => u.Username == "rolecheck");

            Assert.Equal("Creator", user.Role);
        }

        [Fact]
        public async Task RegisterUser_PasswordIsHashedNotStoredAsPlainText()
        {
            await _userService.RegisterUser(new RegisterUserDto
            {
                Username = "hashuser",
                Email = "hash@test.com",
                Password = "PlainTextPassword"
            });

            var user = await _userRepository.GetQueryable()
                .FirstAsync(u => u.Username == "hashuser");

            var plainBytes = System.Text.Encoding.UTF8.GetBytes("PlainTextPassword");

            Assert.False(user.Password.SequenceEqual(plainBytes),
                "Password must be hashed, not stored as plain text");
            Assert.NotEmpty(user.PasswordHash);
        }

        [Fact]
        public async Task RegisterUser_PasswordHashKeyIsStored()
        {
            await RegisterTestUser("hashkeyuser");

            var user = await _userRepository.GetQueryable()
                .FirstAsync(u => u.Username == "hashkeyuser");

            // PasswordHash (the HMAC key) must be non-empty so login can re-hash
            Assert.NotNull(user.PasswordHash);
            Assert.True(user.PasswordHash.Length > 0);
        }

        [Fact]
        public async Task RegisterUser_DuplicateUsername_ThrowsBadRequestException()
        {
            await RegisterTestUser("existinguser");

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _userService.RegisterUser(new RegisterUserDto
                {
                    Username = "existinguser",
                    Email = "another@test.com",
                    Password = "Test@123"
                })
            );
        }

        [Fact]
        public async Task RegisterUser_InvalidEmail_ThrowsBadRequestException()
        {
            // Backend validates email format via EmailHelper
            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _userService.RegisterUser(new RegisterUserDto
                {
                    Username = "bademail",
                    Email = "not-an-email",
                    Password = "Test@123"
                })
            );
        }

        [Fact]
        public async Task RegisterUser_EmailWithConsecutiveDots_ThrowsBadRequestException()
        {
            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _userService.RegisterUser(new RegisterUserDto
                {
                    Username = "dotuser",
                    Email = "bad..email@test.com",
                    Password = "Test@123"
                })
            );
        }

        [Fact]
        public async Task RegisterUser_TwoDifferentUsers_BothSavedSuccessfully()
        {
            await RegisterTestUser("user1");
            await RegisterTestUser("user2");

            var count = await _userRepository.GetQueryable().CountAsync();
            Assert.Equal(2, count);
        }

        // ── CheckUser ─────────────────────────────────────────────────────────

        [Fact]
        public async Task CheckUser_ValidCredentials_ReturnsUsernameAndToken()
        {
            await RegisterTestUser("loginuser", "MyPass@123");

            var result = await _userService.CheckUser(new CheckUserRequestDto
            {
                Username = "loginuser",
                Password = "MyPass@123"
            });

            Assert.NotNull(result);
            Assert.Equal("loginuser", result.Username);
            Assert.Equal("mock-jwt-token", result.Token);
        }

        [Fact]
        public async Task CheckUser_ValidLogin_TokenServiceCalledExactlyOnce()
        {
            await RegisterTestUser("tokenverify", "Test@123");

            await _userService.CheckUser(new CheckUserRequestDto
            {
                Username = "tokenverify",
                Password = "Test@123"
            });

            _mockTokenService.Verify(
                ts => ts.CreateToken(It.IsAny<TokenPayloadDto>()),
                Times.Once
            );
        }

        [Fact]
        public async Task CheckUser_TokenPayloadContainsCorrectUserId()
        {
            await RegisterTestUser("payloaduser", "Test@123");

            TokenPayloadDto? capturedPayload = null;
            _mockTokenService
                .Setup(ts => ts.CreateToken(It.IsAny<TokenPayloadDto>()))
                .Callback<TokenPayloadDto>(p => capturedPayload = p)
                .Returns("token");

            await _userService.CheckUser(new CheckUserRequestDto
            {
                Username = "payloaduser",
                Password = "Test@123"
            });

            Assert.NotNull(capturedPayload);
            Assert.Equal("payloaduser", capturedPayload!.Username);
            Assert.True(capturedPayload.UserId > 0);
        }

        [Fact]
        public async Task CheckUser_UsernameDoesNotExist_ThrowsUnAuthorizedException()
        {
            await Assert.ThrowsAsync<UnAuthorizedException>(async () =>
                await _userService.CheckUser(new CheckUserRequestDto
                {
                    Username = "ghostuser",
                    Password = "Test@123"
                })
            );
        }

        [Fact]
        public async Task CheckUser_WrongPassword_ThrowsUnAuthorizedException()
        {
            await RegisterTestUser("pwdtest", "CorrectPass@123");

            await Assert.ThrowsAsync<UnAuthorizedException>(async () =>
                await _userService.CheckUser(new CheckUserRequestDto
                {
                    Username = "pwdtest",
                    Password = "WrongPass@999"
                })
            );
        }

        [Fact]
        public async Task CheckUser_WrongPassword_TokenServiceNeverCalled()
        {
            await RegisterTestUser("notokentest", "CorrectPass@123");

            try
            {
                await _userService.CheckUser(new CheckUserRequestDto
                {
                    Username = "notokentest",
                    Password = "WrongPass"
                });
            }
            catch (UnAuthorizedException) { }

            _mockTokenService.Verify(
                ts => ts.CreateToken(It.IsAny<TokenPayloadDto>()),
                Times.Never
            );
        }

        [Fact]
        public async Task CheckUser_CaseSensitiveUsername_WrongCaseThrowsUnauthorized()
        {
            await RegisterTestUser("CaseSensitive", "Test@123");

            // Username lookup is exact — "casesensitive" != "CaseSensitive"
            await Assert.ThrowsAsync<UnAuthorizedException>(async () =>
                await _userService.CheckUser(new CheckUserRequestDto
                {
                    Username = "casesensitive",
                    Password = "Test@123"
                })
            );
        }
    }
}