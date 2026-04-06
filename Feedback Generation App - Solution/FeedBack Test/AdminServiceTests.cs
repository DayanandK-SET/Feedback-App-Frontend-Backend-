using Feedback_Generation_App.Contexts;
using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Repositories;
using Feedback_Generation_App.Services;
using Microsoft.EntityFrameworkCore;

namespace FeedbackBack_Unit_Tests
{
    /// <summary>
    /// Tests for AdminService:
    ///   GetAllCreatorsAsync, GetAllSurveysAsync,
    ///   DeleteSurveyAsync, DeleteCreatorAsync,
    ///   ToggleCreatorStatusAsync,
    ///   SearchCreatorsAsync, SearchSurveysAsync,
    ///   SearchAuditLogsAsync
    /// </summary>
    public class AdminServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, User> _userRepository;
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, AuditLog> _auditLogRepository;
        private readonly AdminService _adminService;

        public AdminServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context            = new FeedbackContext(options);
            _userRepository     = new Repository<int, User>(_context);
            _surveyRepository   = new Repository<int, Survey>(_context);
            _auditLogRepository = new Repository<int, AuditLog>(_context);

            _adminService = new AdminService(_userRepository, _surveyRepository, _auditLogRepository);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<User> AddUser(string username, string role = "Creator", bool isDeleted = false)
        {
            var user = new User
            {
                Username     = username,
                Email        = $"{username}@test.com",
                Password     = new byte[] { 1, 2, 3 },
                PasswordHash = new byte[] { 4, 5, 6 },
                Role         = role,
                IsDeleted    = isDeleted
            };
            return (await _userRepository.AddAsync(user))!;
        }

        private async Task<Survey> AddSurvey(
            string title,
            int createdById,
            bool isActive  = true,
            bool isDeleted = false)
        {
            var survey = new Survey
            {
                Title            = title,
                Description      = "Test",
                PublicIdentifier = Guid.NewGuid().ToString(),
                IsActive         = isActive,
                CreatedById      = createdById,
                IsDeleted        = isDeleted
            };
            return (await _surveyRepository.AddAsync(survey))!;
        }

        private async Task<AuditLog> AddAuditLog(
            string action,
            string performedBy,
            string surveyTitle  = "Test Survey",
            DateTime? performedAt = null)
        {
            var log = new AuditLog
            {
                Action      = action,
                SurveyId    = 1,
                SurveyTitle = surveyTitle,
                PerformedBy = performedBy,
                PerformedAt = performedAt ?? DateTime.UtcNow
            };
            return (await _auditLogRepository.AddAsync(log))!;
        }

        // ── GetAllCreatorsAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetAllCreatorsAsync_ReturnsOnlyCreatorRoleUsers()
        {
            await AddUser("creator1", "Creator");
            await AddUser("creator2", "Creator");
            await AddUser("adminuser", "Admin");

            var result = await _adminService.GetAllCreatorsAsync();

            Assert.Equal(2, result.Count);
            Assert.All(result, c => Assert.NotEqual("adminuser", c.Username));
        }

        [Fact]
        public async Task GetAllCreatorsAsync_IncludesBothActiveAndDeletedCreators()
        {
            // GetAllCreatorsAsync returns ALL creators (active + inactive) for admin management
            await AddUser("active", "Creator", isDeleted: false);
            await AddUser("deleted", "Creator", isDeleted: true);

            var result = await _adminService.GetAllCreatorsAsync();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task GetAllCreatorsAsync_IsActiveFlag_ReflectsIsDeletedInverse()
        {
            await AddUser("active", "Creator", isDeleted: false);
            await AddUser("inactive", "Creator", isDeleted: true);

            var result = await _adminService.GetAllCreatorsAsync();

            var active   = result.First(c => c.Username == "active");
            var inactive = result.First(c => c.Username == "inactive");

            Assert.True(active.IsActive);
            Assert.False(inactive.IsActive);
        }

        [Fact]
        public async Task GetAllCreatorsAsync_NoCreators_ReturnsEmptyList()
        {
            await AddUser("admin", "Admin");

            var result = await _adminService.GetAllCreatorsAsync();

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetAllCreatorsAsync_ReturnsDtoWithCorrectFields()
        {
            await AddUser("testcreator", "Creator");

            var result = await _adminService.GetAllCreatorsAsync();

            Assert.Single(result);
            Assert.True(result[0].Id > 0);
            Assert.Equal("testcreator", result[0].Username);
            Assert.Equal("testcreator@test.com", result[0].Email);
        }

        // ── GetAllSurveysAsync ────────────────────────────────────────────────

        [Fact]
        public async Task GetAllSurveysAsync_ReturnsOnlyNonDeletedSurveys()
        {
            var creator = await AddUser("surveycreator");
            await AddSurvey("Survey A", creator.Id);
            await AddSurvey("Survey B", creator.Id);
            await AddSurvey("Deleted Survey", creator.Id, isDeleted: true);

            var result = await _adminService.GetAllSurveysAsync();

            Assert.Equal(2, result.Count);
            Assert.DoesNotContain(result, s => s.Title == "Deleted Survey");
        }

        [Fact]
        public async Task GetAllSurveysAsync_ReturnsSurveysFromAllCreators()
        {
            var c1 = await AddUser("creator_a");
            var c2 = await AddUser("creator_b");
            await AddSurvey("Survey A", c1.Id);
            await AddSurvey("Survey B", c2.Id);

            var result = await _adminService.GetAllSurveysAsync();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task GetAllSurveysAsync_ReturnsDtoWithCreatorName()
        {
            var creator = await AddUser("myname");
            await AddSurvey("My Survey", creator.Id);

            var result = await _adminService.GetAllSurveysAsync();

            Assert.Single(result);
            Assert.Equal("myname", result[0].Creator);
        }

        [Fact]
        public async Task GetAllSurveysAsync_NoSurveys_ReturnsEmptyList()
        {
            var result = await _adminService.GetAllSurveysAsync();

            Assert.Empty(result);
        }

        // ── DeleteSurveyAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task DeleteSurveyAsync_ExistingSurvey_SoftDeletesSurvey()
        {
            var creator = await AddUser("delsurveyuser");
            var survey  = await AddSurvey("To Be Deleted", creator.Id);

            await _adminService.DeleteSurveyAsync(survey.Id);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstOrDefaultAsync(s => s.Id == survey.Id);
            Assert.NotNull(fromDb);
            Assert.True(fromDb!.IsDeleted);
        }

        [Fact]
        public async Task DeleteSurveyAsync_WritesAuditLog()
        {
            var creator = await AddUser("auditdeluser");
            var survey  = await AddSurvey("Audit Survey", creator.Id);

            await _adminService.DeleteSurveyAsync(survey.Id);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyId == survey.Id);
            Assert.NotNull(log);
            Assert.Equal("Survey Deleted", log!.Action);
        }

        [Fact]
        public async Task DeleteSurveyAsync_NonExistentId_ThrowsNotFoundException()
        {
            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.DeleteSurveyAsync(9999)
            );
        }

        [Fact]
        public async Task DeleteSurveyAsync_AlreadyDeletedSurvey_ThrowsNotFoundException()
        {
            var creator = await AddUser("alreadydel");
            var survey  = await AddSurvey("Already Deleted", creator.Id, isDeleted: true);

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.DeleteSurveyAsync(survey.Id)
            );
        }

        // ── DeleteCreatorAsync ────────────────────────────────────────────────

        [Fact]
        public async Task DeleteCreatorAsync_ExistingCreator_SoftDeletesCreator()
        {
            var creator = await AddUser("todelete");

            await _adminService.DeleteCreatorAsync(creator.Id);

            var fromDb = await _userRepository.GetQueryable()
                .FirstOrDefaultAsync(u => u.Id == creator.Id);
            Assert.NotNull(fromDb);
            Assert.True(fromDb!.IsDeleted);
        }

        [Fact]
        public async Task DeleteCreatorAsync_WritesAuditLog()
        {
            var creator = await AddUser("auditcreator");

            await _adminService.DeleteCreatorAsync(creator.Id);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyTitle == creator.Username);
            Assert.NotNull(log);
            Assert.Equal("Creator Deleted", log!.Action);
        }

        [Fact]
        public async Task DeleteCreatorAsync_NonExistentId_ThrowsNotFoundException()
        {
            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.DeleteCreatorAsync(9999)
            );
        }

        [Fact]
        public async Task DeleteCreatorAsync_AdminUser_ThrowsNotFoundException()
        {
            var admin = await AddUser("sysadmin", "Admin");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.DeleteCreatorAsync(admin.Id)
            );
        }

        [Fact]
        public async Task DeleteCreatorAsync_AlreadyDeletedCreator_ThrowsNotFoundException()
        {
            var creator = await AddUser("alreadydel", "Creator", isDeleted: true);

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.DeleteCreatorAsync(creator.Id)
            );
        }

        // ── ToggleCreatorStatusAsync ──────────────────────────────────────────

        [Fact]
        public async Task ToggleCreatorStatusAsync_ActiveCreator_BecomesInactive()
        {
            var creator = await AddUser("toggleactive", "Creator", isDeleted: false);

            await _adminService.ToggleCreatorStatusAsync(creator.Id);

            var fromDb = await _userRepository.GetQueryable()
                .FirstAsync(u => u.Id == creator.Id);
            Assert.True(fromDb.IsDeleted);
        }

        [Fact]
        public async Task ToggleCreatorStatusAsync_InactiveCreator_BecomesActive()
        {
            var creator = await AddUser("toggleinactive", "Creator", isDeleted: true);

            await _adminService.ToggleCreatorStatusAsync(creator.Id);

            var fromDb = await _userRepository.GetQueryable()
                .FirstAsync(u => u.Id == creator.Id);
            Assert.False(fromDb.IsDeleted);
        }

        [Fact]
        public async Task ToggleCreatorStatusAsync_WritesAuditLog()
        {
            var creator = await AddUser("toggleaudit", "Creator", isDeleted: false);

            await _adminService.ToggleCreatorStatusAsync(creator.Id);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyTitle == creator.Username);
            Assert.NotNull(log);
            Assert.Equal("Creator Deactivated", log!.Action);
        }

        [Fact]
        public async Task ToggleCreatorStatusAsync_NonExistentId_ThrowsNotFoundException()
        {
            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _adminService.ToggleCreatorStatusAsync(9999)
            );
        }

        // ── SearchCreatorsAsync ───────────────────────────────────────────────

        [Fact]
        public async Task SearchCreatorsAsync_NoFilters_ReturnsAllCreators()
        {
            await AddUser("alice", "Creator");
            await AddUser("bob", "Creator");
            await AddUser("admin", "Admin");

            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10
            });

            Assert.Equal(2, result.TotalCount);
            Assert.Equal(2, result.Creators.Count);
        }

        [Fact]
        public async Task SearchCreatorsAsync_SearchByUsername_ReturnsMatchingCreators()
        {
            await AddUser("alice", "Creator");
            await AddUser("bob", "Creator");

            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                Search     = "ali"
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("alice", result.Creators[0].Username);
        }

        [Fact]
        public async Task SearchCreatorsAsync_FilterActiveOnly_ReturnsOnlyActiveCreators()
        {
            await AddUser("active1", "Creator", isDeleted: false);
            await AddUser("inactive1", "Creator", isDeleted: true);

            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                IsActive   = true
            });

            Assert.Equal(1, result.TotalCount);
            Assert.True(result.Creators[0].IsActive);
        }

        [Fact]
        public async Task SearchCreatorsAsync_FilterInactiveOnly_ReturnsOnlyInactiveCreators()
        {
            await AddUser("active1", "Creator", isDeleted: false);
            await AddUser("inactive1", "Creator", isDeleted: true);

            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                IsActive   = false
            });

            Assert.Equal(1, result.TotalCount);
            Assert.False(result.Creators[0].IsActive);
        }

        [Fact]
        public async Task SearchCreatorsAsync_Pagination_ReturnsCorrectPage()
        {
            for (int i = 1; i <= 5; i++)
                await AddUser($"creator{i}", "Creator");

            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 2,
                PageSize   = 2
            });

            Assert.Equal(5, result.TotalCount);
            Assert.Equal(2, result.Creators.Count);
            Assert.Equal(2, result.PageNumber);
        }

        [Fact]
        public async Task SearchCreatorsAsync_TotalAllCreators_IsUnaffectedByFilters()
        {
            await AddUser("active1", "Creator", isDeleted: false);
            await AddUser("inactive1", "Creator", isDeleted: true);

            // Filter to active only — but TotalAllCreators should still be 2
            var result = await _adminService.SearchCreatorsAsync(new GetAdminCreatorsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                IsActive   = true
            });

            Assert.Equal(2, result.TotalAllCreators);
            Assert.Equal(1, result.TotalCount);
        }

        // ── SearchSurveysAsync ────────────────────────────────────────────────

        [Fact]
        public async Task SearchSurveysAsync_NoFilters_ReturnsAllNonDeletedSurveys()
        {
            var creator = await AddUser("sc1");
            await AddSurvey("Survey A", creator.Id);
            await AddSurvey("Survey B", creator.Id);
            await AddSurvey("Deleted", creator.Id, isDeleted: true);

            var result = await _adminService.SearchSurveysAsync(new GetAdminSurveysRequestDto
            {
                PageNumber = 1,
                PageSize   = 10
            });

            Assert.Equal(2, result.TotalCount);
        }

        [Fact]
        public async Task SearchSurveysAsync_SearchByTitle_ReturnsMatchingSurveys()
        {
            var creator = await AddUser("sc2");
            await AddSurvey("Customer Feedback", creator.Id);
            await AddSurvey("Employee Survey", creator.Id);

            var result = await _adminService.SearchSurveysAsync(new GetAdminSurveysRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                Search     = "Customer"
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Customer Feedback", result.Surveys[0].Title);
        }

        [Fact]
        public async Task SearchSurveysAsync_FilterActiveOnly_ReturnsOnlyActiveSurveys()
        {
            var creator = await AddUser("sc3");
            await AddSurvey("Active Survey", creator.Id, isActive: true);
            await AddSurvey("Inactive Survey", creator.Id, isActive: false);

            var result = await _adminService.SearchSurveysAsync(new GetAdminSurveysRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                IsActive   = true
            });

            Assert.Equal(1, result.TotalCount);
            Assert.True(result.Surveys[0].IsActive);
        }

        [Fact]
        public async Task SearchSurveysAsync_TotalAllSurveys_IsUnaffectedByFilters()
        {
            var creator = await AddUser("sc4");
            await AddSurvey("Active", creator.Id, isActive: true);
            await AddSurvey("Inactive", creator.Id, isActive: false);

            var result = await _adminService.SearchSurveysAsync(new GetAdminSurveysRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                IsActive   = true
            });

            Assert.Equal(2, result.TotalAllSurveys);
            Assert.Equal(1, result.TotalActiveSurveys);
        }

        // ── SearchAuditLogsAsync ──────────────────────────────────────────────

        [Fact]
        public async Task SearchAuditLogsAsync_NoFilters_ReturnsAllLogs()
        {
            await AddAuditLog("Survey Deleted", "admin");
            await AddAuditLog("Survey Updated", "creator1");

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10
            });

            Assert.Equal(2, result.TotalCount);
            Assert.Equal(2, result.Logs.Count);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_SearchByAction_ReturnsMatchingLogs()
        {
            await AddAuditLog("Survey Deleted", "admin");
            await AddAuditLog("Survey Updated", "creator1");

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                Search     = "Deleted"
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Survey Deleted", result.Logs[0].Action);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_SearchByPerformedBy_ReturnsMatchingLogs()
        {
            await AddAuditLog("Survey Deleted", "admin");
            await AddAuditLog("Survey Updated", "creator1");

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                Search     = "creator1"
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("creator1", result.Logs[0].PerformedBy);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_FromDateFilter_ExcludesOlderLogs()
        {
            await AddAuditLog("Old Action", "admin", performedAt: DateTime.UtcNow.AddDays(-10));
            await AddAuditLog("New Action", "admin", performedAt: DateTime.UtcNow);

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                FromDate   = DateTime.UtcNow.AddDays(-1)
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("New Action", result.Logs[0].Action);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_ToDateFilter_ExcludesNewerLogs()
        {
            await AddAuditLog("Old Action", "admin", performedAt: DateTime.UtcNow.AddDays(-10));
            await AddAuditLog("New Action", "admin", performedAt: DateTime.UtcNow);

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10,
                ToDate     = DateTime.UtcNow.AddDays(-5)
            });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Old Action", result.Logs[0].Action);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_Pagination_ReturnsCorrectPage()
        {
            for (int i = 1; i <= 5; i++)
                await AddAuditLog($"Action {i}", "admin");

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 2,
                PageSize   = 2
            });

            Assert.Equal(5, result.TotalCount);
            Assert.Equal(2, result.Logs.Count);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_OrderedByMostRecentFirst()
        {
            await AddAuditLog("First", "admin", performedAt: DateTime.UtcNow.AddMinutes(-10));
            await AddAuditLog("Second", "admin", performedAt: DateTime.UtcNow);

            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10
            });

            Assert.Equal("Second", result.Logs[0].Action);
            Assert.Equal("First", result.Logs[1].Action);
        }

        [Fact]
        public async Task SearchAuditLogsAsync_NoLogs_ReturnsEmptyResult()
        {
            var result = await _adminService.SearchAuditLogsAsync(new GetAuditLogsRequestDto
            {
                PageNumber = 1,
                PageSize   = 10
            });

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Logs);
        }
    }
}
