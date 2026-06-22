using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using CCSUMeerut.Recruitment.Api.Data;
using CCSUMeerut.Recruitment.Api.Entities;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using CCSUMeerut.Recruitment.Api.Models;
using CCSUMeerut.Recruitment.Api.Repositories;

namespace CCSUMeerut.Recruitment.Api.Services;

public class ApplicantService : IApplicantService
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
    private const string RecruitmentAdvertisementNumber = "CCSU/General/NT-01/2024";

    private static readonly DocumentFieldDefinition[] DocumentFields =
    [
        new() { Key = "passportPhoto", Label = "Passport Size Photo" },
        new() { Key = "signature", Label = "Signature" },
        new() { Key = "aadhaarCard", Label = "Aadhaar Card" },
        new() { Key = "categoryCertificate", Label = "Category Certificate" },
        new() { Key = "domicileCertificate", Label = "Domicile Certificate" },
        new() { Key = "ewsCertificate", Label = "EWS Certificate" },
        new() { Key = "disabilityCertificate", Label = "Disability Certificate" },
        new() { Key = "highSchoolCertificate", Label = "High School Certificate" },
        new() { Key = "intermediateCertificate", Label = "Intermediate Certificate" },
        new() { Key = "graduationCertificate", Label = "Graduation Certificate" },
        new() { Key = "postGraduationCertificate", Label = "Post-Graduation Certificate" },
        new() { Key = "experienceCertificate", Label = "Experience Certificate" },
        new() { Key = "relievingLetter", Label = "Relieving Letter" },
        new() { Key = "salarySlips", Label = "Salary Slips (Last 3 months)" },
        new() { Key = "otherExperienceCertificate", Label = "Other Previous Service Experience Certificate" },
        new() { Key = "otherRelievingLetter", Label = "Other Previous Service Relieving Letter" },
    ];

    private static readonly string[] PersonalRequiredFields =
    [
        "name",
        "fatherName",
        "motherName",
        "aadhaarNumber",
        "dateOfBirth",
        "mobileNumber",
        "emailAddress",
        "gender",
        "category",
        "domicileState",
        "addressLine1",
        "city",
        "state",
        "pinCode",
    ];

    private static readonly HashSet<string> PreviousServiceRegistrationTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Fresher",
        "Experience",
    };

    private static readonly HashSet<string> EmploymentNatureOptions = new(StringComparer.OrdinalIgnoreCase)
    {
        "Permanent",
        "Contract",
        "Temporary",
    };

    private static readonly HashSet<string> RecruitmentPostOptions = new(StringComparer.OrdinalIgnoreCase)
    {
        "Programmer Grade - 1",
    };

    private readonly IApplicantRepository _applicantRepository;
    private readonly IFileStorageService _fileStorageService;
    private readonly IEmailService _emailService;
    private readonly RecruitmentDbContext _dbContext;

    public ApplicantService(
        IApplicantRepository applicantRepository,
        IFileStorageService fileStorageService,
        IEmailService emailService,
        RecruitmentDbContext dbContext)
    {
        _applicantRepository = applicantRepository;
        _fileStorageService = fileStorageService;
        _emailService = emailService;
        _dbContext = dbContext;
    }

    public async Task<RegisterApplicantResult> CreateApplicantAsync(
        PersonalDetailsInputDto personalInput,
        CancellationToken cancellationToken)
    {
        var personalDetails = SanitizePersonalDetails(personalInput);
        ValidatePersonalDetails(personalDetails);

        if (await IsMobileNumberRegisteredAsync(personalDetails.MobileNumber, cancellationToken))
        {
            throw HttpError(
                StatusCodes.Status409Conflict,
                $"You are Allready registered with {personalDetails.MobileNumber} Mobile Number.");
        }

        var now = IsoNow();
        var password = GeneratePassword(personalDetails.Name, personalDetails.MobileNumber);
        var token = GenerateToken();
        var temporaryId = $"TEMP-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Random.Shared.Next(0, 100001)}";

        var applicant = new ApplicantRecord
        {
            LoginId = temporaryId,
            PasswordHash = HashPassword(password),
            SessionToken = token,
            PaymentStatus = "pending",
            ApplicationStatus = "draft",
            CurrentStep = "recruitment",
            CreatedAt = now,
            UpdatedAt = now,
        };

        // Initialize relations
        applicant.PersonalDetails = new PersonalDetailsRecord { ApplicantId = applicant.Id };
        MapPersonalDetails(personalDetails, applicant.PersonalDetails);
        
        applicant.RecruitmentDetails = new RecruitmentDetailsRecord 
        { 
            ApplicantId = applicant.Id,
            AdvertisementNumber = string.Empty,
            PostAppliedFor = string.Empty
        };

        await _applicantRepository.AddAsync(applicant, cancellationToken);
        await _applicantRepository.SaveChangesAsync(cancellationToken);

        applicant.LoginId = GenerateRegistrationNumber(applicant.Id);
        applicant.UpdatedAt = now;

        await _applicantRepository.SaveChangesAsync(cancellationToken);

        // Send registration email
        try
        {
            var applicantName = personalDetails.Name?.Trim();
            var emailBody = $@"Dear {applicantName},

Congratulations! Your application has been successfully registered with the Mobile Number - {personalDetails.MobileNumber}

Your Login Details:
Registration Number: {applicant.LoginId}
Password: {password}

Please use these credentials to log in to the portal.

Note: Your application is not complete yet. Please log in to the portal, complete the application form, and submit it successfully.

Important:

* Do not share your password
* Change password after first login

Regards,
CCSU Recruitment Team";

            await _emailService.SendEmailAsync(
                personalDetails.EmailAddress,
                "Application Registered Successfully",
                emailBody);
        }
        catch (Exception ex)
        {
            // Log error but don't fail registration
            Console.WriteLine($"Failed to send registration email: {ex.Message}");
        }

        var payload = BuildApplicantPayload(CreateSnapshot(applicant));
        return new RegisterApplicantResult
        {
            Token = token,
            Password = password,
            Applicant = payload,
        };
    }

    public async Task<LoginApplicantResult> LoginApplicantAsync(
        string loginId,
        string password,
        CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepository.FindByLoginIdAsync(
            NormalizeText(loginId),
            cancellationToken);

        if (applicant is null)
        {
            var digits = DigitsOnly(loginId);
            if (digits.Length == 10)
            {
                applicant = await _applicantRepository.FindByMobileNumberAsync(digits, cancellationToken);
            }
        }

        if (applicant is null || applicant.PasswordHash != HashPassword(password))
        {
            throw HttpError(StatusCodes.Status401Unauthorized, "Invalid registration number/mobile number or password.");
        }

        var token = GenerateToken();
        applicant.SessionToken = token;
        applicant.UpdatedAt = IsoNow();

        await _applicantRepository.SaveChangesAsync(cancellationToken);

        return new LoginApplicantResult
        {
            Token = token,
            Applicant = BuildApplicantPayload(CreateSnapshot(applicant)),
        };
    }

    public async Task ResetPasswordAsync(ResetPasswordRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RegistrationNumber) ||
            string.IsNullOrWhiteSpace(request.MobileNumber) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please complete all required fields.");
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Passwords do not match.");
        }

        var applicant = await _applicantRepository.FindByLoginIdAsync(
            NormalizeText(request.RegistrationNumber),
            cancellationToken);

        if (applicant is null)
        {
            throw HttpError(StatusCodes.Status404NotFound, "Registration Number not found.");
        }

        var registeredMobile = DigitsOnly(applicant.PersonalDetails?.MobileNumber ?? string.Empty);
        var inputMobile = DigitsOnly(request.MobileNumber);

        if (string.IsNullOrWhiteSpace(registeredMobile) || registeredMobile != inputMobile)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Registered Mobile Number does not match our records.");
        }

        applicant.PasswordHash = HashPassword(request.NewPassword);
        await _applicantRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task VerifyResetDetailsAsync(string registrationNumber, string mobileNumber, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(registrationNumber) || string.IsNullOrWhiteSpace(mobileNumber))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please provide registration number and mobile number.");
        }

        var applicant = await _applicantRepository.FindByLoginIdAsync(
            NormalizeText(registrationNumber),
            cancellationToken);

        if (applicant is null)
        {
            throw HttpError(StatusCodes.Status404NotFound, "Invalid details");
        }

        var registeredMobile = DigitsOnly(applicant.PersonalDetails?.MobileNumber ?? string.Empty);
        var inputMobile = DigitsOnly(mobileNumber);

        if (string.IsNullOrWhiteSpace(registeredMobile) || registeredMobile != inputMobile)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Invalid details");
        }
    }

    public async Task SendResetPasswordOtpAsync(string identifier, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please provide Registration Number or Mobile Number.");
        }

        Console.WriteLine($"[DEBUG] SendResetPasswordOtpAsync called for identifier: {identifier}");
        var normalizedIdentifier = NormalizeText(identifier);
        Console.WriteLine($"[DEBUG] Normalized identifier: {normalizedIdentifier}");
        var applicant = await _applicantRepository.FindByLoginIdAsync(normalizedIdentifier, cancellationToken);
        
        if (applicant is null)
        {
            Console.WriteLine("[DEBUG] Applicant not found by LoginId, trying MobileNumber...");
            var digits = DigitsOnly(identifier);
            if (digits.Length == 10)
            {
                applicant = await _applicantRepository.FindByMobileNumberAsync(digits, cancellationToken);
            }
        }

        if (applicant is null)
        {
            Console.WriteLine("[DEBUG] Applicant not found after checking both LoginId and MobileNumber.");
            throw HttpError(StatusCodes.Status404NotFound, "Account not found with provided details.");
        }

        Console.WriteLine($"[DEBUG] Found applicant: {applicant.LoginId}");

        var email = applicant.PersonalDetails?.EmailAddress;
        if (string.IsNullOrWhiteSpace(email))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "No registered email address found for this account.");
        }

        var otp = Random.Shared.Next(100000, 999999).ToString();
        applicant.ResetOtp = otp;
        applicant.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(15);
        
        Console.WriteLine($"[DEBUG] Generated OTP: {otp} for email: {email}");
        
        await _applicantRepository.SaveChangesAsync(cancellationToken);
        Console.WriteLine("[DEBUG] Saved OTP to database.");

        var emailBody = $@"Dear Applicant,

Your OTP for password reset is: {otp}

This OTP is valid for 15 minutes. Please do not share this OTP with anyone.

Regards,
CCSU Recruitment Team";

        Console.WriteLine($"[DEBUG] Sending email to {email}...");
        await _emailService.SendEmailAsync(email, "Password Reset OTP", emailBody);
        Console.WriteLine("[DEBUG] SendEmailAsync completed.");
    }

    public async Task<bool> VerifyResetPasswordOtpAsync(string identifier, string otp, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(otp))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Identifier and OTP are required.");
        }

        var applicant = await FindApplicantByIdentifierAsync(identifier, cancellationToken);
        
        if (applicant is null)
        {
            throw HttpError(StatusCodes.Status404NotFound, "Account not found.");
        }

        if (applicant.ResetOtp != otp || applicant.ResetOtpExpiry < DateTime.UtcNow)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Invalid OTP.");
        }

        return true;
    }

    public async Task ResetPasswordWithOtpAsync(ResetPasswordWithOtpDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || 
            string.IsNullOrWhiteSpace(request.Otp) || 
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "All fields are required.");
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Passwords do not match.");
        }

        var applicant = await FindApplicantByIdentifierAsync(request.Identifier, cancellationToken);
        
        if (applicant is null)
        {
            throw HttpError(StatusCodes.Status404NotFound, "Account not found.");
        }

        if (applicant.ResetOtp != request.Otp || applicant.ResetOtpExpiry < DateTime.UtcNow)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Invalid OTP.");
        }

        applicant.PasswordHash = HashPassword(request.NewPassword);
        applicant.ResetOtp = null;
        applicant.ResetOtpExpiry = null;
        
        await _applicantRepository.SaveChangesAsync(cancellationToken);

        // Send confirmation email
        var email = applicant.PersonalDetails?.EmailAddress;
        if (!string.IsNullOrWhiteSpace(email))
        {
            Console.WriteLine($"[DEBUG] Sending password change confirmation email to {email}...");
            var emailBody = $@"Dear Applicant,

Your password has been changed successfully.

Your New Password is: {request.NewPassword}

Please use this password for future logins.

Regards,
CCSU Recruitment Team";

            try
            {
                await _emailService.SendEmailAsync(email, "Password Changed Successfully", emailBody);
                Console.WriteLine("[DEBUG] Password change confirmation email sent successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to send password change confirmation email: {ex.Message}");
            }
        }
    }

    private async Task<ApplicantRecord?> FindApplicantByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        var normalizedIdentifier = NormalizeText(identifier);
        var applicant = await _applicantRepository.FindByLoginIdAsync(normalizedIdentifier, cancellationToken);
        
        if (applicant is null)
        {
            var digits = DigitsOnly(identifier);
            if (digits.Length == 10)
            {
                applicant = await _applicantRepository.FindByMobileNumberAsync(digits, cancellationToken);
            }
        }

        return applicant;
    }

    public async Task<bool> IsMobileNumberRegisteredAsync(string mobileNumber, CancellationToken cancellationToken)
    {
        var normalizedMobileNumber = DigitsOnly(mobileNumber);
        if (!Regex.IsMatch(normalizedMobileNumber, @"^\d{10}$"))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Mobile number must contain exactly 10 digits.");
        }

        var applicant = await _applicantRepository.FindByMobileNumberAsync(
            normalizedMobileNumber,
            cancellationToken,
            asNoTracking: true);

        return applicant is not null;
    }

    public async Task<bool> IsAadhaarNumberRegisteredAsync(string aadhaarNumber, CancellationToken cancellationToken)
    {
        var normalizedAadhaarNumber = DigitsOnly(aadhaarNumber);
        if (!Regex.IsMatch(normalizedAadhaarNumber, @"^\d{12}$"))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Aadhaar number must contain exactly 12 digits.");
        }

        var applicant = await _applicantRepository.FindByAadhaarNumberAsync(
            normalizedAadhaarNumber,
            cancellationToken,
            asNoTracking: true);

        return applicant is not null;
    }

    public async Task LogoutApplicantAsync(string token, CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepository.FindBySessionTokenAsync(token, cancellationToken);
        if (applicant is null)
        {
            return;
        }

        applicant.SessionToken = null;
        applicant.UpdatedAt = IsoNow();
        await _applicantRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<ApplicantDto?> GetApplicantByTokenAsync(string token, CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepository.FindBySessionTokenAsync(
            token,
            cancellationToken,
            asNoTracking: true);

        return applicant is null ? null : BuildApplicantPayload(CreateSnapshot(applicant));
    }

    public async Task<ApplicantDto> UpdatePersonalDetailsAsync(
        int recordId,
        PersonalDetailsInputDto personalInput,
        CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        if (!string.IsNullOrWhiteSpace(personalInput.MobileNumber) &&
            DigitsOnly(personalInput.MobileNumber) != snapshot.PersonalDetails.MobileNumber)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Mobile number cannot be edited once registration is created.");
        }

        var updatedPersonalDetails = SanitizePersonalDetails(new PersonalDetailsInputDto
        {
            Name = ValueOrExisting(personalInput.Name, snapshot.PersonalDetails.Name),
            FatherName = ValueOrExisting(personalInput.FatherName, snapshot.PersonalDetails.FatherName),
            MotherName = ValueOrExisting(personalInput.MotherName, snapshot.PersonalDetails.MotherName),
            AadhaarNumber = ValueOrExisting(personalInput.AadhaarNumber, snapshot.PersonalDetails.AadhaarNumber),
            DateOfBirth = ValueOrExisting(personalInput.DateOfBirth, snapshot.PersonalDetails.DateOfBirth),
            MobileNumber = snapshot.PersonalDetails.MobileNumber,
            AlternateMobileNumber = ValueOrExisting(
                personalInput.AlternateMobileNumber,
                snapshot.PersonalDetails.AlternateMobileNumber),
            EmailAddress = ValueOrExisting(personalInput.EmailAddress, snapshot.PersonalDetails.EmailAddress),
            Gender = ValueOrExisting(personalInput.Gender, snapshot.PersonalDetails.Gender),
            Nationality = ValueOrExisting(personalInput.Nationality, snapshot.PersonalDetails.Nationality),
            Category = ValueOrExisting(personalInput.Category, snapshot.PersonalDetails.Category),
            IsUpDomicile = ValueOrExisting(personalInput.IsUpDomicile, snapshot.PersonalDetails.IsUpDomicile),
            PersonWithDisability = ValueOrExisting(personalInput.PersonWithDisability, snapshot.PersonalDetails.PersonWithDisability),
            IsEws = ValueOrExisting(personalInput.IsEws, snapshot.PersonalDetails.IsEws),
            DomicileCertificateNumber = ValueOrExisting(
                personalInput.DomicileCertificateNumber,
                snapshot.PersonalDetails.DomicileCertificateNumber),
            DomicileState = ValueOrExisting(personalInput.DomicileState, snapshot.PersonalDetails.DomicileState),
            CorrespondenceAddress = ValueOrExisting(
                personalInput.CorrespondenceAddress,
                snapshot.PersonalDetails.CorrespondenceAddress),
            CorrespondencePinCode = ValueOrExisting(
                personalInput.CorrespondencePinCode,
                snapshot.PersonalDetails.CorrespondencePinCode),
            CorrespondenceState = ValueOrExisting(
                personalInput.CorrespondenceState,
                snapshot.PersonalDetails.CorrespondenceState),
            CorrespondenceDistrict = ValueOrExisting(
                personalInput.CorrespondenceDistrict,
                snapshot.PersonalDetails.CorrespondenceDistrict),
            SameAsCorrespondence = personalInput.SameAsCorrespondence ?? snapshot.PersonalDetails.SameAsCorrespondence,
            PermanentAddress = ValueOrExisting(
                personalInput.PermanentAddress,
                snapshot.PersonalDetails.PermanentAddress),
            PermanentPinCode = ValueOrExisting(
                personalInput.PermanentPinCode,
                snapshot.PersonalDetails.PermanentPinCode),
            PermanentState = ValueOrExisting(
                personalInput.PermanentState,
                snapshot.PersonalDetails.PermanentState),
            PermanentDistrict = ValueOrExisting(
                personalInput.PermanentDistrict,
                snapshot.PersonalDetails.PermanentDistrict),
            CorrespondenceAddressLine1 = ValueOrExisting(
                personalInput.CorrespondenceAddressLine1,
                snapshot.PersonalDetails.CorrespondenceAddressLine1),
            CorrespondenceAddressLine2 = ValueOrExisting(
                personalInput.CorrespondenceAddressLine2,
                snapshot.PersonalDetails.CorrespondenceAddressLine2),
            PermanentAddressLine1 = ValueOrExisting(
                personalInput.PermanentAddressLine1,
                snapshot.PersonalDetails.PermanentAddressLine1),
            PermanentAddressLine2 = ValueOrExisting(
                personalInput.PermanentAddressLine2,
                snapshot.PersonalDetails.PermanentAddressLine2),
            AddressLine1 = ValueOrExisting(personalInput.AddressLine1, snapshot.PersonalDetails.AddressLine1),
            AddressLine2 = personalInput.AddressLine2 ?? snapshot.PersonalDetails.AddressLine2,
            City = ValueOrExisting(personalInput.City, snapshot.PersonalDetails.City),
            State = ValueOrExisting(personalInput.State, snapshot.PersonalDetails.State),
            PinCode = ValueOrExisting(personalInput.PinCode, snapshot.PersonalDetails.PinCode),
        });

        ValidatePersonalDetails(updatedPersonalDetails);

        snapshot.PersonalDetails = updatedPersonalDetails;
        snapshot.CurrentStep = "recruitment";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> UpdateRecruitmentDetailsAsync(
        int recordId,
        RecruitmentDetailsDto recruitmentInput,
        CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        var updatedRecruitmentDetails = SanitizeRecruitmentDetails(recruitmentInput);
        ValidateRecruitmentDetails(updatedRecruitmentDetails);

        snapshot.RecruitmentDetails = updatedRecruitmentDetails;
        snapshot.CurrentStep = "education";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> UpdateEducationDetailsAsync(
        int recordId,
        EducationDetailsDto educationInput,
        CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        var updatedEducationDetails = SanitizeEducationDetails(educationInput);
        if (string.IsNullOrWhiteSpace(updatedEducationDetails.PreviousServiceDetails.RegistrationType) &&
            !string.IsNullOrWhiteSpace(snapshot.EducationDetails.PreviousServiceDetails.RegistrationType))
        {
            updatedEducationDetails.PreviousServiceDetails = snapshot.EducationDetails.PreviousServiceDetails;
        }

        ValidateEducationDetails(updatedEducationDetails);

        snapshot.EducationDetails = updatedEducationDetails;
        snapshot.CurrentStep = "service";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> UpdatePreviousServiceDetailsAsync(
        int recordId,
        PreviousServiceDetailsDto serviceInput,
        CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        var updatedPreviousServiceDetails = SanitizePreviousServiceDetails(serviceInput);
        ValidatePreviousServiceDetails(updatedPreviousServiceDetails);

        snapshot.EducationDetails.PreviousServiceDetails = updatedPreviousServiceDetails;
        snapshot.CurrentStep = "documents";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> SaveDocumentAsync(
        int recordId,
        string field,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        EnsureDocumentField(field);

        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);
        DocumentRecordDto? uploadedDocument = null;

        try
        {
            uploadedDocument = await _fileStorageService.SaveUploadAsync(file, cancellationToken);
            await _fileStorageService.DeleteStoredUploadAsync(
                snapshot.Documents.GetValueOrDefault(field),
                cancellationToken);

            snapshot.Documents[field] = uploadedDocument;
            snapshot.CurrentStep = AreDocumentsComplete(snapshot) ? "payment" : "documents";
            snapshot.UpdatedAt = IsoNow();

            return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
        }
        catch
        {
            if (uploadedDocument is not null)
            {
                await _fileStorageService.DeleteStoredUploadAsync(uploadedDocument, cancellationToken);
            }

            throw;
        }
    }

    public async Task<ApplicantDto> DeleteDocumentAsync(
        int recordId,
        string field,
        CancellationToken cancellationToken)
    {
        EnsureDocumentField(field);

        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        await _fileStorageService.DeleteStoredUploadAsync(
            snapshot.Documents.GetValueOrDefault(field),
            cancellationToken);

        snapshot.Documents.Remove(field);
        snapshot.CurrentStep = "documents";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> CompletePaymentAsync(
        int recordId,
        PaymentRequestDto paymentInput,
        CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        if (!IsPersonalComplete(snapshot.PersonalDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Complete personal details before payment.");
        }

        if (!IsRecruitmentComplete(snapshot.RecruitmentDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Complete recruitment details before payment.");
        }

        if (!IsEducationComplete(snapshot.EducationDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Complete educational details before payment.");
        }

        if (!IsServiceComplete(snapshot.EducationDetails.PreviousServiceDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Complete previous service details before payment.");
        }

        if (!AreDocumentsComplete(snapshot))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Upload all required documents before payment.");
        }

        var payerName = NormalizeText(paymentInput.PayerName);
        var paymentMethod = NormalizeText(paymentInput.PaymentMethod);

        if (string.IsNullOrWhiteSpace(payerName) || string.IsNullOrWhiteSpace(paymentMethod))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Payer name and payment method are required.");
        }

        snapshot.PaymentStatus = "completed";
        snapshot.PaymentDetails = new PaymentDetailsDto
        {
            Amount = CalculateFee(snapshot.PersonalDetails.Category),
            PaymentMethod = paymentMethod,
            PayerName = payerName,
            TransactionId = $"TXN-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            PaidAt = IsoNow(),
        };
        snapshot.CurrentStep = "payment";
        snapshot.UpdatedAt = IsoNow();

        return await PersistSnapshotAsync(applicant, snapshot, cancellationToken);
    }

    public async Task<ApplicantDto> SubmitApplicationAsync(int recordId, CancellationToken cancellationToken)
    {
        var applicant = await RequireApplicantAsync(recordId, cancellationToken);
        var snapshot = CreateSnapshot(applicant);

        if (!IsPersonalComplete(snapshot.PersonalDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Personal details are incomplete.");
        }

        if (!IsRecruitmentComplete(snapshot.RecruitmentDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Recruitment details are incomplete.");
        }

        if (!IsEducationComplete(snapshot.EducationDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Educational details are incomplete.");
        }

        if (!IsServiceComplete(snapshot.EducationDetails.PreviousServiceDetails))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Previous service details are incomplete.");
        }

        if (!AreDocumentsComplete(snapshot))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Required documents are missing.");
        }

        if (!string.Equals(snapshot.PaymentStatus, "completed", StringComparison.Ordinal))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Payment is pending.");
        }

        snapshot.ApplicationStatus = "submitted";
        snapshot.CurrentStep = "submitted";
        snapshot.UpdatedAt = IsoNow();
        snapshot.SubmittedAt = IsoNow();

        var result = await PersistSnapshotAsync(applicant, snapshot, cancellationToken);

        try
        {
            var emailBody = $@"Dear {snapshot.PersonalDetails.Name},

Congratulations! Your recruitment application has been submitted successfully to Chaudhary Charan Singh University, Meerut, Uttar Pradesh.

Your application details are as follows:

Registration Number: {snapshot.LoginId}
Registered Mobile Number: {snapshot.PersonalDetails.MobileNumber}
Applied Post: {snapshot.RecruitmentDetails.PostAppliedFor}
Advertisement Number: {snapshot.RecruitmentDetails.AdvertisementNumber}
Payment Amount: {snapshot.PaymentDetails.Amount}
Payment Status: Completed
Final Submission Date & Time: {DateTime.Now:dd-MM-yyyy HH:mm:ss}

Your application has been successfully recorded in the CCSU Recruitment Portal.

Please keep your Registration Number safely for future reference. You are advised to download and print the submitted application form for your records.

For further updates regarding recruitment, please visit the official portal regularly.

Regards,
Recruitment Team
Chaudhary Charan Singh University, Meerut, Uttar Pradesh.";

            await _emailService.SendEmailAsync(
                snapshot.PersonalDetails.EmailAddress,
                "Application Final Submitted Successfully – CCSU Recruitment Application",
                emailBody);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Failed to send submission confirmation email to {snapshot.PersonalDetails.EmailAddress}: {ex.Message}");
        }

        return result;
    }

    private async Task<ApplicantRecord> RequireApplicantAsync(int recordId, CancellationToken cancellationToken)
    {
        var applicant = await _applicantRepository.FindByIdAsync(recordId, cancellationToken);
        if (applicant is null)
        {
            throw HttpError(StatusCodes.Status404NotFound, "Applicant record not found.");
        }

        return applicant;
    }

    private async Task<ApplicantDto> PersistSnapshotAsync(
        ApplicantRecord applicant,
        ApplicantSnapshot snapshot,
        CancellationToken cancellationToken)
    {
        Console.WriteLine($"[DEBUG] Starting PersistSnapshot for Applicant {applicant.LoginId}");
        // 1. Update core applicant properties
        applicant.PaymentStatus = snapshot.PaymentStatus;
        applicant.ApplicationStatus = snapshot.ApplicationStatus;
        applicant.CurrentStep = snapshot.CurrentStep;
        applicant.UpdatedAt = snapshot.UpdatedAt;
        applicant.SubmittedAt = snapshot.SubmittedAt;

        // 2. Personal Details (1:1)
        if (applicant.PersonalDetails == null)
        {
            applicant.PersonalDetails = new PersonalDetailsRecord { ApplicantId = applicant.Id };
        }
        MapPersonalDetails(snapshot.PersonalDetails, applicant.PersonalDetails);

        // 3. Recruitment Details (1:1)
        if (applicant.RecruitmentDetails == null)
        {
            applicant.RecruitmentDetails = new RecruitmentDetailsRecord { ApplicantId = applicant.Id };
        }
        applicant.RecruitmentDetails.AdvertisementNumber = snapshot.RecruitmentDetails.AdvertisementNumber;
        applicant.RecruitmentDetails.PostAppliedFor = snapshot.RecruitmentDetails.PostAppliedFor;

        // 4. Education Records
        var currentEducation = applicant.EducationRecords.ToList();
        foreach (var er in currentEducation)
        {
            _dbContext.EducationRecords.Remove(er);
        }
        applicant.EducationRecords.Clear();
        
        AddEducationRecord(applicant, "HighSchool", snapshot.EducationDetails.HighSchool);
        AddEducationRecord(applicant, "Intermediate", snapshot.EducationDetails.Intermediate);
        if (snapshot.EducationDetails?.Graduation?.Enabled == true)
            AddEducationRecord(applicant, "Graduation", snapshot.EducationDetails.Graduation);
        if (snapshot.EducationDetails?.PostGraduation?.Enabled == true)
            AddEducationRecord(applicant, "PostGraduation", snapshot.EducationDetails.PostGraduation);

        Console.WriteLine("[DEBUG] Updating Experience Records");
        var currentExperience = applicant.ExperienceRecords.ToList();
        foreach (var expRec in currentExperience)
        {
            _dbContext.ExperienceRecords.Remove(expRec);
        }
        applicant.ExperienceRecords.Clear();
        
        var experiences = snapshot.EducationDetails?.PreviousServiceDetails?.Experiences ?? new List<PreviousServiceEntryDto>();
        foreach (var exp in experiences)
        {
            applicant.ExperienceRecords.Add(new ExperienceRecord
            {
                ApplicantId = applicant.Id,
                OrganizationName = exp.OrganizationName,
                DepartmentName = exp.DepartmentName,
                Designation = exp.Designation,
                NatureOfEmployment = exp.NatureOfEmployment,
                DateOfJoining = exp.DateOfJoining,
                DateOfRelieving = exp.DateOfRelieving,
                TotalExperience = exp.TotalExperience
            });
        }

        // 6. Document Records
        // Update documents map to records
        foreach (var kvp in snapshot.Documents)
        {
            var existingDoc = applicant.DocumentRecords.FirstOrDefault(d => d.DocumentKey == kvp.Key);
            if (existingDoc == null)
            {
                applicant.DocumentRecords.Add(new DocumentRecord
                {
                    ApplicantId = applicant.Id,
                    DocumentKey = kvp.Key,
                    OriginalName = kvp.Value.OriginalName,
                    StoredName = kvp.Value.StoredName,
                    Size = kvp.Value.Size,
                    Mimetype = kvp.Value.Mimetype,
                    Url = kvp.Value.Url,
                    UploadedAt = kvp.Value.UploadedAt
                });
            }
            else
            {
                existingDoc.OriginalName = kvp.Value.OriginalName;
                existingDoc.StoredName = kvp.Value.StoredName;
                existingDoc.Size = kvp.Value.Size;
                existingDoc.Mimetype = kvp.Value.Mimetype;
                existingDoc.Url = kvp.Value.Url;
                existingDoc.UploadedAt = kvp.Value.UploadedAt;
            }
        }
        // Remove documents that are no longer in the snapshot
        var keysInSnapshot = snapshot.Documents.Keys.ToHashSet();
        var docsToRemove = applicant.DocumentRecords.Where(d => !keysInSnapshot.Contains(d.DocumentKey)).ToList();
        foreach (var doc in docsToRemove) applicant.DocumentRecords.Remove(doc);

        // 7. Payment Records
        if (snapshot.PaymentStatus == "completed")
        {
            var existingPayment = applicant.PaymentRecords.FirstOrDefault(p => p.TransactionId == snapshot.PaymentDetails.TransactionId);
            if (existingPayment == null && !string.IsNullOrEmpty(snapshot.PaymentDetails.TransactionId))
            {
                applicant.PaymentRecords.Add(new PaymentRecord
                {
                    ApplicantId = applicant.Id,
                    Amount = (decimal)snapshot.PaymentDetails.Amount,
                    PaymentMethod = snapshot.PaymentDetails.PaymentMethod,
                    PayerName = snapshot.PaymentDetails.PayerName,
                    TransactionId = snapshot.PaymentDetails.TransactionId,
                    PaidAt = snapshot.PaymentDetails.PaidAt
                });
            }
        }

        Console.WriteLine("[DEBUG] Saving changes to database");
        await _applicantRepository.SaveChangesAsync(cancellationToken);
        Console.WriteLine("[DEBUG] Changes saved successfully");
        return BuildApplicantPayload(snapshot);
    }

    private static ApplicantSnapshot CreateSnapshot(ApplicantRecord applicant)
    {
        // Map from relational entities back to the Snapshot DTO structure
        var personalDetails = MapPersonalDetailsFromRecord(applicant.PersonalDetails);
        var recruitmentDetails = new RecruitmentDetailsDto
        {
            AdvertisementNumber = applicant.RecruitmentDetails?.AdvertisementNumber ?? string.Empty,
            PostAppliedFor = applicant.RecruitmentDetails?.PostAppliedFor ?? string.Empty
        };

        var educationDetails = MapEducationDetailsFromRecords(applicant);
        
        var documents = applicant.DocumentRecords.ToDictionary(
            d => d.DocumentKey,
            d => new DocumentRecordDto
            {
                OriginalName = d.OriginalName,
                StoredName = d.StoredName,
                Size = d.Size,
                Mimetype = d.Mimetype,
                Url = d.Url,
                UploadedAt = d.UploadedAt
            });

        var latestPayment = applicant.PaymentRecords.OrderByDescending(p => p.PaidAt).FirstOrDefault();
        var paymentDetails = new PaymentDetailsDto
        {
            Amount = latestPayment != null ? (int)latestPayment.Amount : 0,
            PaymentMethod = latestPayment?.PaymentMethod ?? string.Empty,
            PayerName = latestPayment?.PayerName ?? string.Empty,
            TransactionId = latestPayment?.TransactionId ?? string.Empty,
            PaidAt = latestPayment?.PaidAt ?? string.Empty
        };

        return new ApplicantSnapshot
        {
            Id = applicant.Id,
            LoginId = applicant.LoginId,
            PersonalDetails = personalDetails,
            RecruitmentDetails = recruitmentDetails,
            EducationDetails = educationDetails,
            Documents = documents,
            PaymentStatus = applicant.PaymentStatus,
            PaymentDetails = paymentDetails,
            ApplicationStatus = applicant.ApplicationStatus,
            CurrentStep = applicant.CurrentStep,
            CreatedAt = applicant.CreatedAt,
            UpdatedAt = applicant.UpdatedAt,
            SubmittedAt = applicant.SubmittedAt,
        };
    }

    private static ApplicantDto BuildApplicantPayload(ApplicantSnapshot snapshot)
    {
        var requiredDocumentKeys = GetRequiredDocumentKeys(snapshot);
        var completion = new CompletionStatusDto
        {
            Personal = IsPersonalComplete(snapshot.PersonalDetails),
            Recruitment = IsRecruitmentComplete(snapshot.RecruitmentDetails),
            Education = IsEducationComplete(snapshot.EducationDetails),
            Service = IsServiceComplete(snapshot.EducationDetails.PreviousServiceDetails),
            Documents = AreDocumentsComplete(snapshot),
            Payment = string.Equals(snapshot.PaymentStatus, "completed", StringComparison.Ordinal),
            Submitted = string.Equals(snapshot.ApplicationStatus, "submitted", StringComparison.Ordinal),
        };

        var resumeStep = completion.Submitted
            ? "submitted"
            : !completion.Personal
                ? "personal"
                : !completion.Recruitment
                    ? "recruitment"
                : !completion.Education
                    ? "education"
                    : !completion.Service
                        ? "service"
                    : !completion.Documents
                        ? "documents"
                        : "payment";

        var checklist = DocumentFields.Select(field =>
        {
            snapshot.Documents.TryGetValue(field.Key, out var documentRecord);

            return new DocumentChecklistItemDto
            {
                Key = field.Key,
                Label = field.Label,
                Required = requiredDocumentKeys.Contains(field.Key),
                Uploaded = !string.IsNullOrWhiteSpace(documentRecord?.Url),
                FileName = documentRecord?.OriginalName ?? string.Empty,
                Url = documentRecord?.Url ?? string.Empty,
                UploadedAt = documentRecord?.UploadedAt ?? string.Empty,
            };
        }).ToList();

        return new ApplicantDto
        {
            RecordId = snapshot.Id,
            LoginId = snapshot.LoginId,
            PersonalDetails = snapshot.PersonalDetails,
            RecruitmentDetails = snapshot.RecruitmentDetails,
            EducationDetails = snapshot.EducationDetails,
            Documents = snapshot.Documents,
            DocumentChecklist = checklist,
            PaymentStatus = snapshot.PaymentStatus,
            PaymentDetails = snapshot.PaymentDetails,
            ApplicationStatus = snapshot.ApplicationStatus,
            CurrentStep = snapshot.CurrentStep,
            ResumeStep = resumeStep,
            Completion = completion,
            FeeAmount = CalculateFee(snapshot.PersonalDetails.Category),
            CreatedAt = snapshot.CreatedAt,
            UpdatedAt = snapshot.UpdatedAt,
            SubmittedAt = snapshot.SubmittedAt,
        };
    }

    private static List<string> GetRequiredDocumentKeys(ApplicantSnapshot snapshot)
    {
        var required = new List<string>
        {
            "passportPhoto",
            "signature",
            "highSchoolCertificate",
            "intermediateCertificate",
            "aadhaarCard",
            "domicileCertificate",
        };

        if (snapshot.EducationDetails.Graduation.Enabled)
        {
            required.Add("graduationCertificate");
        }

        if (snapshot.EducationDetails.PostGraduation.Enabled)
        {
            required.Add("postGraduationCertificate");
        }

        var category = snapshot.PersonalDetails.Category.ToLowerInvariant();
        if (category is not "general" and not "")
        {
            required.Add("categoryCertificate");
        }

        if (string.Equals(snapshot.PersonalDetails.PersonWithDisability, "Yes", StringComparison.OrdinalIgnoreCase))
        {
            required.Add("disabilityCertificate");
        }

        if (string.Equals(snapshot.PersonalDetails.IsEws, "Yes", StringComparison.OrdinalIgnoreCase))
        {
            required.Add("ewsCertificate");
        }

        if (string.Equals(snapshot.EducationDetails.PreviousServiceDetails.RegistrationType, "Experience", StringComparison.OrdinalIgnoreCase))
        {
            required.Add("experienceCertificate");
            required.Add("relievingLetter");
            required.Add("salarySlips");
        }

        return required;
    }

    private static bool IsPersonalComplete(PersonalDetailsDto personalDetails)
    {
        return PersonalRequiredFields.All(field => !string.IsNullOrWhiteSpace(GetPersonalFieldValue(personalDetails, field))) &&
            string.IsNullOrWhiteSpace(GetDateOfBirthError(personalDetails.DateOfBirth));
    }

    private static bool IsRecruitmentComplete(RecruitmentDetailsDto recruitmentDetails)
    {
        return !string.IsNullOrWhiteSpace(recruitmentDetails.AdvertisementNumber) &&
            RecruitmentPostOptions.Contains(NormalizeText(recruitmentDetails.PostAppliedFor));
    }

    private static bool IsEducationComplete(EducationDetailsDto educationDetails)
    {
        if (!BlockValues(educationDetails.HighSchool).All(value => !string.IsNullOrWhiteSpace(value)))
        {
            return false;
        }

        if (!BlockValues(educationDetails.Intermediate).All(value => !string.IsNullOrWhiteSpace(value)))
        {
            return false;
        }

        if (educationDetails.Graduation.Enabled &&
            !BlockValues(educationDetails.Graduation).All(value => !string.IsNullOrWhiteSpace(value)))
        {
            return false;
        }

        if (educationDetails.PostGraduation.Enabled &&
            !PostGraduateBlockValues(educationDetails.PostGraduation).All(value => !string.IsNullOrWhiteSpace(value)))
        {
            return false;
        }

        return true;
    }

    private static bool IsServiceComplete(PreviousServiceDetailsDto serviceDetails)
    {
        var registrationType = NormalizeText(serviceDetails.RegistrationType);

        if (!PreviousServiceRegistrationTypes.Contains(registrationType))
        {
            return false;
        }

        if (!string.Equals(registrationType, "Experience", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (serviceDetails.Experiences.Count == 0)
        {
            return false;
        }

        return serviceDetails.Experiences.All(entry =>
            !string.IsNullOrWhiteSpace(entry.OrganizationName) &&
            !string.IsNullOrWhiteSpace(entry.DepartmentName) &&
            !string.IsNullOrWhiteSpace(entry.Designation) &&
            EmploymentNatureOptions.Contains(entry.NatureOfEmployment) &&
            TryParseDateOnly(entry.DateOfJoining, out var joiningDate) &&
            TryParseDateOnly(entry.DateOfRelieving, out var relievingDate) &&
            relievingDate >= joiningDate);
    }

    private static bool AreDocumentsComplete(ApplicantSnapshot snapshot)
    {
        var requiredKeys = GetRequiredDocumentKeys(snapshot);
        return requiredKeys.All(key =>
            snapshot.Documents.TryGetValue(key, out var documentRecord) &&
            !string.IsNullOrWhiteSpace(documentRecord.Url));
    }

    private static void EnsureDocumentField(string field)
    {
        if (!DocumentFields.Any(item => item.Key == field))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Unknown document field.");
        }
    }

    private static void ValidatePersonalDetails(PersonalDetailsDto personalDetails)
    {
        var missingFields = PersonalRequiredFields
            .Where(field => string.IsNullOrWhiteSpace(GetPersonalFieldValue(personalDetails, field)))
            .ToList();

        if (missingFields.Count > 0)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Please complete all required personal details.");
        }

        var dateOfBirthError = GetDateOfBirthError(personalDetails.DateOfBirth);
        if (!string.IsNullOrWhiteSpace(dateOfBirthError))
        {
            throw HttpError(StatusCodes.Status400BadRequest, dateOfBirthError);
        }

        if (personalDetails.AadhaarNumber.Length != 12)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Aadhaar number must contain exactly 12 digits.");
        }

        if (personalDetails.MobileNumber.Length != 10)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Mobile number must contain exactly 10 digits.");
        }

        if (!string.IsNullOrWhiteSpace(personalDetails.AlternateMobileNumber) &&
            personalDetails.AlternateMobileNumber.Length != 10)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Alternate mobile number must contain exactly 10 digits.");
        }

        if (!string.IsNullOrWhiteSpace(personalDetails.AlternateMobileNumber) &&
            personalDetails.MobileNumber == personalDetails.AlternateMobileNumber)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Mobile No and Alternate Mobile No cannot be same.");
        }

        if (!EmailPattern.IsMatch(personalDetails.EmailAddress))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Please enter a valid email address.");
        }

        if (personalDetails.PinCode.Length != 6)
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "PIN code must contain exactly 6 digits.");
        }
    }

    private static void ValidateRecruitmentDetails(RecruitmentDetailsDto recruitmentDetails)
    {
        if (string.IsNullOrWhiteSpace(recruitmentDetails.AdvertisementNumber) ||
            string.IsNullOrWhiteSpace(recruitmentDetails.PostAppliedFor))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Please complete all required recruitment details.");
        }

        if (!string.Equals(
                recruitmentDetails.AdvertisementNumber,
                RecruitmentAdvertisementNumber,
                StringComparison.OrdinalIgnoreCase))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Invalid advertisement number selected.");
        }

        if (!RecruitmentPostOptions.Contains(recruitmentDetails.PostAppliedFor))
        {
            throw HttpError(
                StatusCodes.Status400BadRequest,
                "Invalid post applied for selection.");
        }
    }

    private static string GetDateOfBirthError(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        if (!DateOnly.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var dateOfBirth))
        {
            return "Please enter a valid date of birth.";
        }

        return GetAgeInYears(dateOfBirth, DateOnly.FromDateTime(DateTime.Today)) < 18
            ? "Age must be 18 years or above."
            : string.Empty;
    }

    private static int GetAgeInYears(DateOnly dateOfBirth, DateOnly today)
    {
        var age = today.Year - dateOfBirth.Year;

        if (today.Month < dateOfBirth.Month ||
            (today.Month == dateOfBirth.Month && today.Day < dateOfBirth.Day))
        {
            age--;
        }

        return age;
    }

    private static void ValidateEducationDetails(EducationDetailsDto educationDetails)
    {
        ValidateBlock(BlockValues(educationDetails.HighSchool), "High school");
        ValidateBlock(BlockValues(educationDetails.Intermediate), "Intermediate");
        ValidatePassingYearGap(
            educationDetails.HighSchool.PassingYear, 
            educationDetails.Intermediate.PassingYear,
            educationDetails.Graduation.PassingYear,
            educationDetails.PostGraduation.PassingYear);
        
        if (educationDetails.PostGraduation.Enabled && !educationDetails.Graduation.Enabled)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please Fill Graduation details first.");
        }

        if (educationDetails.Graduation.Enabled)
        {
            ValidateBlock(BlockValues(educationDetails.Graduation), "Graduation");
        }

        if (educationDetails.PostGraduation.Enabled)
        {
            ValidateBlock(PostGraduateBlockValues(educationDetails.PostGraduation), "Post-graduation");
        }
    }

    private static void ValidatePreviousServiceDetails(PreviousServiceDetailsDto serviceDetails)
    {
        var registrationType = NormalizeText(serviceDetails.RegistrationType);
        if (!PreviousServiceRegistrationTypes.Contains(registrationType))
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please select a valid registration type.");
        }

        if (!string.Equals(registrationType, "Experience", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (serviceDetails.Experiences.Count == 0)
        {
            throw HttpError(StatusCodes.Status400BadRequest, "Please add at least one experience record.");
        }

        foreach (var entry in serviceDetails.Experiences)
        {
            if (string.IsNullOrWhiteSpace(entry.OrganizationName) ||
                string.IsNullOrWhiteSpace(entry.DepartmentName) ||
                string.IsNullOrWhiteSpace(entry.Designation) ||
                string.IsNullOrWhiteSpace(entry.NatureOfEmployment) ||
                string.IsNullOrWhiteSpace(entry.DateOfJoining) ||
                string.IsNullOrWhiteSpace(entry.DateOfRelieving))
            {
                throw HttpError(StatusCodes.Status400BadRequest, "Please complete all experience details.");
            }

            if (!EmploymentNatureOptions.Contains(entry.NatureOfEmployment))
            {
                throw HttpError(StatusCodes.Status400BadRequest, "Please select a valid nature of employment.");
            }

            if (!TryParseDateOnly(entry.DateOfJoining, out var joiningDate) ||
                !TryParseDateOnly(entry.DateOfRelieving, out var relievingDate))
            {
                throw HttpError(StatusCodes.Status400BadRequest, "Please enter valid joining and relieving dates.");
            }

            if (relievingDate < joiningDate)
            {
                throw HttpError(StatusCodes.Status400BadRequest, "Date of Relieving cannot be earlier than Date of Joining.");
            }
        }
    }

    private static void ValidateBlock(IEnumerable<string> values, string label)
    {
        if (values.Any(value => string.IsNullOrWhiteSpace(value)))
        {
            throw HttpError(StatusCodes.Status400BadRequest, $"{label} details are incomplete.");
        }
    }

    private static void ValidatePassingYearGap(
        string highSchoolPassingYear, 
        string intermediatePassingYear, 
        string graduationPassingYear,
        string postGraduationPassingYear)
    {
        if (int.TryParse(highSchoolPassingYear, out var hsYear) &&
            int.TryParse(intermediatePassingYear, out var intYear))
        {
            if (intYear - hsYear < 2)
            {
                throw HttpError(
                    StatusCodes.Status400BadRequest,
                    "Invalid entry! Intermediate passing year must be at least 2 years after the High School passing year.");
            }
        }

        if (int.TryParse(intermediatePassingYear, out var intYear2) &&
            int.TryParse(graduationPassingYear, out var gradYear))
        {
            if (gradYear - intYear2 < 3)
            {
                throw HttpError(
                    StatusCodes.Status400BadRequest,
                    "Invalid Entry! Graduation passing year must be at least 3 year after the Intermediate passing year.");
            }
        }

        if (int.TryParse(graduationPassingYear, out var gradYear2) &&
            int.TryParse(postGraduationPassingYear, out var postGradYear))
        {
            if (postGradYear - gradYear2 < 2)
            {
                throw HttpError(
                    StatusCodes.Status400BadRequest,
                    "Invalid Entry! Post Graduation passing year must be at least 2 year after the Graduation passing year.");
            }
        }
    }

    private static PersonalDetailsDto SanitizePersonalDetails(PersonalDetailsInputDto input)
    {
        var legacyAddress = NormalizeText(input.AddressLine1);
        var legacyCity = NormalizeText(input.City);
        var legacyState = NormalizeText(input.State);
        var legacyPinCode = DigitsOnly(input.PinCode);
        var hasModernAddressValues =
            !string.IsNullOrWhiteSpace(NormalizeText(input.CorrespondenceAddress)) ||
            !string.IsNullOrWhiteSpace(NormalizeText(input.PermanentAddress)) ||
            !string.IsNullOrWhiteSpace(NormalizeText(input.CorrespondenceDistrict)) ||
            !string.IsNullOrWhiteSpace(NormalizeText(input.PermanentDistrict));

        var correspondenceAddressLine1 = NormalizeText(input.CorrespondenceAddressLine1);
        var correspondenceAddressLine2 = NormalizeText(input.CorrespondenceAddressLine2);
        var correspondenceAddress = !string.IsNullOrWhiteSpace(correspondenceAddressLine1)
            ? $"{correspondenceAddressLine1} {correspondenceAddressLine2}".Trim()
            : FirstNonEmptyText(input.CorrespondenceAddress, input.AddressLine2, legacyAddress);

        var correspondencePinCode = DigitsOnly(FirstNonEmptyText(input.CorrespondencePinCode, legacyPinCode));
        var correspondenceState = FirstNonEmptyText(input.CorrespondenceState, legacyState);
        var correspondenceDistrict = FirstNonEmptyText(input.CorrespondenceDistrict, legacyCity);

        var sameAsCorrespondence = input.SameAsCorrespondence ?? false;
        if (!hasModernAddressValues && !string.IsNullOrWhiteSpace(legacyAddress))
        {
            sameAsCorrespondence = true;
        }

        var permanentAddressLine1 = NormalizeText(input.PermanentAddressLine1);
        var permanentAddressLine2 = NormalizeText(input.PermanentAddressLine2);
        var permanentAddress = !string.IsNullOrWhiteSpace(permanentAddressLine1)
            ? $"{permanentAddressLine1} {permanentAddressLine2}".Trim()
            : FirstNonEmptyText(input.PermanentAddress, legacyAddress, correspondenceAddress);

        var permanentPinCode = DigitsOnly(FirstNonEmptyText(input.PermanentPinCode, legacyPinCode));
        var permanentState = FirstNonEmptyText(input.PermanentState, legacyState, correspondenceState);
        var permanentDistrict = FirstNonEmptyText(input.PermanentDistrict, legacyCity, correspondenceDistrict);

        if (sameAsCorrespondence)
        {
            permanentAddress = correspondenceAddress;
            permanentAddressLine1 = correspondenceAddressLine1;
            permanentAddressLine2 = correspondenceAddressLine2;
            permanentPinCode = correspondencePinCode;
            permanentState = correspondenceState;
            permanentDistrict = correspondenceDistrict;
        }

        var normalizedDomicileChoice = FirstNonEmptyText(
            input.IsUpDomicile,
            string.Equals(NormalizeText(input.DomicileState), "Uttar Pradesh", StringComparison.OrdinalIgnoreCase)
                ? "Yes"
                : !string.IsNullOrWhiteSpace(NormalizeText(input.DomicileState))
                    ? "No"
                    : string.Empty);
        var domicileState = normalizedDomicileChoice == "Yes"
            ? "Uttar Pradesh"
            : FirstNonEmptyText(
                input.DomicileState,
                permanentState,
                correspondenceState,
                "Outside Uttar Pradesh");

        return new PersonalDetailsDto
        {
            Name = NormalizeText(input.Name),
            FatherName = NormalizeText(input.FatherName),
            MotherName = NormalizeText(input.MotherName),
            AadhaarNumber = DigitsOnly(input.AadhaarNumber),
            DateOfBirth = NormalizeText(input.DateOfBirth),
            MobileNumber = DigitsOnly(input.MobileNumber),
            AlternateMobileNumber = DigitsOnly(input.AlternateMobileNumber),
            EmailAddress = NormalizeText(input.EmailAddress).ToLowerInvariant(),
            Gender = NormalizeText(input.Gender),
            Nationality = FirstNonEmptyText(input.Nationality, "Indian"),
            Category = NormalizeText(input.Category),
            IsUpDomicile = normalizedDomicileChoice,
            PersonWithDisability = FirstNonEmptyText(input.PersonWithDisability, "No"),
            IsEws = FirstNonEmptyText(input.IsEws, "No"),
            DomicileCertificateNumber = NormalizeText(input.DomicileCertificateNumber),
            DomicileState = domicileState,
            CorrespondenceAddress = correspondenceAddress,
            CorrespondencePinCode = correspondencePinCode,
            CorrespondenceState = correspondenceState,
            CorrespondenceDistrict = correspondenceDistrict,
            SameAsCorrespondence = sameAsCorrespondence,
            PermanentAddress = permanentAddress,
            PermanentPinCode = permanentPinCode,
            PermanentState = permanentState,
            PermanentDistrict = permanentDistrict,
            CorrespondenceAddressLine1 = correspondenceAddressLine1,
            CorrespondenceAddressLine2 = correspondenceAddressLine2,
            PermanentAddressLine1 = permanentAddressLine1,
            PermanentAddressLine2 = permanentAddressLine2,
            AddressLine1 = permanentAddress,
            AddressLine2 = correspondenceAddress,
            City = permanentDistrict,
            State = permanentState,
            PinCode = permanentPinCode,
        };
    }

    private static RecruitmentDetailsDto SanitizeRecruitmentDetails(RecruitmentDetailsDto input)
    {
        return new RecruitmentDetailsDto
        {
            AdvertisementNumber = NormalizeText(input.AdvertisementNumber),
            PostAppliedFor = NormalizeText(input.PostAppliedFor),
        };
    }

    private static EducationDetailsDto SanitizeEducationDetails(EducationDetailsDto input)
    {
        var graduationEnabled =
            input.Graduation.Enabled ||
            !string.IsNullOrWhiteSpace(input.Graduation.University) ||
            !string.IsNullOrWhiteSpace(input.Graduation.Course) ||
            !string.IsNullOrWhiteSpace(input.Graduation.PassingYear) ||
            !string.IsNullOrWhiteSpace(input.Graduation.MaxMarks) ||
            !string.IsNullOrWhiteSpace(input.Graduation.MarksObtained);

        var postGraduationEnabled =
            input.PostGraduation.Enabled ||
            !string.IsNullOrWhiteSpace(input.PostGraduation.University) ||
            !string.IsNullOrWhiteSpace(input.PostGraduation.Course) ||
            !string.IsNullOrWhiteSpace(input.PostGraduation.PassingYear) ||
            !string.IsNullOrWhiteSpace(input.PostGraduation.MaxMarks) ||
            !string.IsNullOrWhiteSpace(input.PostGraduation.MarksObtained);

        return new EducationDetailsDto
        {
            HighSchool = new SchoolAcademicBlockDto
            {
                Board = NormalizeText(input.HighSchool.Board),
                PassingYear = NormalizeText(input.HighSchool.PassingYear),
                MarksObtained = NormalizeNumericText(input.HighSchool.MarksObtained),
                MaxMarks = NormalizeNumericText(input.HighSchool.MaxMarks),
            },
            Intermediate = new SchoolAcademicBlockDto
            {
                Board = NormalizeText(input.Intermediate.Board),
                PassingYear = NormalizeText(input.Intermediate.PassingYear),
                MarksObtained = NormalizeNumericText(input.Intermediate.MarksObtained),
                MaxMarks = NormalizeNumericText(input.Intermediate.MaxMarks),
            },
            Graduation = new GraduationAcademicBlockDto
            {
                Enabled = graduationEnabled,
                University = NormalizeText(input.Graduation.University),
                Course = NormalizeText(input.Graduation.Course),
                PassingYear = NormalizeText(input.Graduation.PassingYear),
                MarksObtained = NormalizeNumericText(input.Graduation.MarksObtained),
                MaxMarks = NormalizeNumericText(input.Graduation.MaxMarks),
            },
            PostGraduation = new PostGraduationBlockDto
            {
                Enabled = postGraduationEnabled,
                University = NormalizeText(input.PostGraduation.University),
                Course = NormalizeText(input.PostGraduation.Course),
                PassingYear = NormalizeText(input.PostGraduation.PassingYear),
                MarksObtained = NormalizeNumericText(input.PostGraduation.MarksObtained),
                MaxMarks = NormalizeNumericText(input.PostGraduation.MaxMarks),
            },
            PreviousServiceDetails = SanitizePreviousServiceDetails(input.PreviousServiceDetails),
            AdditionalQualification = NormalizeText(input.AdditionalQualification),
        };
    }

    private static PreviousServiceDetailsDto SanitizePreviousServiceDetails(PreviousServiceDetailsDto? input)
    {
        var experiences = (input?.Experiences ?? [])
            .Select(entry => new PreviousServiceEntryDto
            {
                OrganizationName = NormalizeText(entry.OrganizationName),
                DepartmentName = NormalizeText(entry.DepartmentName),
                Designation = NormalizeText(entry.Designation),
                NatureOfEmployment = NormalizeText(entry.NatureOfEmployment),
                DateOfJoining = NormalizeText(entry.DateOfJoining),
                DateOfRelieving = NormalizeText(entry.DateOfRelieving),
            })
            .Where(entry => !IsBlankPreviousServiceEntry(entry))
            .Select(entry =>
            {
                entry.TotalExperience = CalculateTotalExperience(entry.DateOfJoining, entry.DateOfRelieving);
                return entry;
            })
            .ToList();

        return new PreviousServiceDetailsDto
        {
            RegistrationType = NormalizeText(input?.RegistrationType),
            Experiences = experiences,
        };
    }

    private static PersonalDetailsDto CreateEmptyPersonalDetails()
    {
        return new PersonalDetailsDto();
    }

    private static RecruitmentDetailsDto CreateEmptyRecruitmentDetails()
    {
        return new RecruitmentDetailsDto();
    }

    private static EducationDetailsDto CreateEmptyEducationDetails()
    {
        return new EducationDetailsDto();
    }

    private static PaymentDetailsDto CreateEmptyPaymentDetails()
    {
        return new PaymentDetailsDto();
    }

    private static PersonalDetailsDto MergePersonalDefaults(PersonalDetailsDto? input)
    {
        return SanitizePersonalDetails(new PersonalDetailsInputDto
        {
            Name = input?.Name,
            FatherName = input?.FatherName,
            MotherName = input?.MotherName,
            AadhaarNumber = input?.AadhaarNumber,
            DateOfBirth = input?.DateOfBirth,
            MobileNumber = input?.MobileNumber,
            AlternateMobileNumber = input?.AlternateMobileNumber,
            EmailAddress = input?.EmailAddress,
            Gender = input?.Gender,
            Nationality = input?.Nationality,
            Category = input?.Category,
            IsUpDomicile = input?.IsUpDomicile,
            DomicileCertificateNumber = input?.DomicileCertificateNumber,
            DomicileState = input?.DomicileState,
            CorrespondenceAddress = input?.CorrespondenceAddress,
            CorrespondencePinCode = input?.CorrespondencePinCode,
            CorrespondenceState = input?.CorrespondenceState,
            CorrespondenceDistrict = input?.CorrespondenceDistrict,
            SameAsCorrespondence = input?.SameAsCorrespondence,
            PermanentAddress = input?.PermanentAddress,
            PermanentPinCode = input?.PermanentPinCode,
            PermanentState = input?.PermanentState,
            PermanentDistrict = input?.PermanentDistrict,
            CorrespondenceAddressLine1 = input?.CorrespondenceAddressLine1,
            CorrespondenceAddressLine2 = input?.CorrespondenceAddressLine2,
            PermanentAddressLine1 = input?.PermanentAddressLine1,
            PermanentAddressLine2 = input?.PermanentAddressLine2,
            AddressLine1 = input?.AddressLine1,
            AddressLine2 = input?.AddressLine2,
            City = input?.City,
            State = input?.State,
            PinCode = input?.PinCode,
            PersonWithDisability = input?.PersonWithDisability,
            IsEws = input?.IsEws,
        });
    }

    private static RecruitmentDetailsDto MergeRecruitmentDefaults(RecruitmentDetailsDto? input)
    {
        return new RecruitmentDetailsDto
        {
            AdvertisementNumber = input?.AdvertisementNumber ?? string.Empty,
            PostAppliedFor = input?.PostAppliedFor ?? string.Empty,
        };
    }

    private static EducationDetailsDto MergeEducationDefaults(EducationDetailsDto? input)
    {
        return new EducationDetailsDto
        {
            HighSchool = new SchoolAcademicBlockDto
            {
                Board = input?.HighSchool?.Board ?? string.Empty,
                PassingYear = input?.HighSchool?.PassingYear ?? string.Empty,
                MarksObtained = input?.HighSchool?.MarksObtained ?? string.Empty,
                MaxMarks = input?.HighSchool?.MaxMarks ?? string.Empty,
            },
            Intermediate = new SchoolAcademicBlockDto
            {
                Board = input?.Intermediate?.Board ?? string.Empty,
                PassingYear = input?.Intermediate?.PassingYear ?? string.Empty,
                MarksObtained = input?.Intermediate?.MarksObtained ?? string.Empty,
                MaxMarks = input?.Intermediate?.MaxMarks ?? string.Empty,
            },
            Graduation = new GraduationAcademicBlockDto
            {
                University = input?.Graduation?.University ?? string.Empty,
                Course = input?.Graduation?.Course ?? string.Empty,
                PassingYear = input?.Graduation?.PassingYear ?? string.Empty,
                MarksObtained = input?.Graduation?.MarksObtained ?? string.Empty,
                MaxMarks = input?.Graduation?.MaxMarks ?? string.Empty,
            },
            PostGraduation = new PostGraduationBlockDto
            {
                Enabled = input?.PostGraduation?.Enabled ?? false,
                University = input?.PostGraduation?.University ?? string.Empty,
                Course = input?.PostGraduation?.Course ?? string.Empty,
                PassingYear = input?.PostGraduation?.PassingYear ?? string.Empty,
                MarksObtained = input?.PostGraduation?.MarksObtained ?? string.Empty,
                MaxMarks = input?.PostGraduation?.MaxMarks ?? string.Empty,
            },
            PreviousServiceDetails = MergePreviousServiceDefaults(input?.PreviousServiceDetails),
            AdditionalQualification = input?.AdditionalQualification ?? string.Empty,
        };
    }

    private static PreviousServiceDetailsDto MergePreviousServiceDefaults(PreviousServiceDetailsDto? input)
    {
        return new PreviousServiceDetailsDto
        {
            RegistrationType = input?.RegistrationType ?? string.Empty,
            Experiences = (input?.Experiences ?? [])
                .Select(entry => new PreviousServiceEntryDto
                {
                    OrganizationName = entry.OrganizationName ?? string.Empty,
                    DepartmentName = entry.DepartmentName ?? string.Empty,
                    Designation = entry.Designation ?? string.Empty,
                    NatureOfEmployment = entry.NatureOfEmployment ?? string.Empty,
                    DateOfJoining = entry.DateOfJoining ?? string.Empty,
                    DateOfRelieving = entry.DateOfRelieving ?? string.Empty,
                    TotalExperience = string.IsNullOrWhiteSpace(entry.TotalExperience)
                        ? CalculateTotalExperience(entry.DateOfJoining, entry.DateOfRelieving)
                        : entry.TotalExperience,
                })
                .ToList(),
        };
    }

    private static PaymentDetailsDto MergePaymentDefaults(PaymentDetailsDto? input)
    {
        return new PaymentDetailsDto
        {
            Amount = input?.Amount ?? 0,
            PaymentMethod = input?.PaymentMethod ?? string.Empty,
            PayerName = input?.PayerName ?? string.Empty,
            TransactionId = input?.TransactionId ?? string.Empty,
            PaidAt = input?.PaidAt ?? string.Empty,
        };
    }

    private static string ValueOrExisting(string? incomingValue, string existingValue)
    {
        return incomingValue is null ? existingValue : incomingValue;
    }

    private static string FirstNonEmptyText(params string?[] values)
    {
        foreach (var value in values)
        {
            var normalized = NormalizeText(value);
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                return normalized;
            }
        }

        return string.Empty;
    }

    private static string NormalizeText(string? value)
    {
        return (value ?? string.Empty).Trim();
    }

    private static string DigitsOnly(string? value)
    {
        return new string((value ?? string.Empty).Where(char.IsDigit).ToArray()).Trim();
    }

    private static string NormalizeNumericText(string? value)
    {
        return new string((value ?? string.Empty)
            .Where(character => char.IsDigit(character) || character == '.')
            .ToArray()).Trim();
    }

    private static bool IsBlankPreviousServiceEntry(PreviousServiceEntryDto entry)
    {
        return string.IsNullOrWhiteSpace(entry.OrganizationName) &&
            string.IsNullOrWhiteSpace(entry.DepartmentName) &&
            string.IsNullOrWhiteSpace(entry.Designation) &&
            string.IsNullOrWhiteSpace(entry.NatureOfEmployment) &&
            string.IsNullOrWhiteSpace(entry.DateOfJoining) &&
            string.IsNullOrWhiteSpace(entry.DateOfRelieving);
    }

    private static bool TryParseDateOnly(string? value, out DateOnly date)
    {
        return DateOnly.TryParseExact(
            NormalizeText(value),
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
    }

    private static string CalculateTotalExperience(string? joiningValue, string? leavingValue)
    {
        if (!TryParseDateOnly(joiningValue, out var joiningDate) ||
            !TryParseDateOnly(leavingValue, out var leavingDate) ||
            leavingDate < joiningDate)
        {
            return string.Empty;
        }

        var years = leavingDate.Year - joiningDate.Year;
        var months = leavingDate.Month - joiningDate.Month;
        var days = leavingDate.Day - joiningDate.Day;

        if (days < 0)
        {
            months--;
            var previousMonth = leavingDate.AddMonths(-1);
            days += DateTime.DaysInMonth(previousMonth.Year, previousMonth.Month);
        }

        if (months < 0)
        {
            years--;
            months += 12;
        }

        var parts = new List<string>();
        if (years > 0)
        {
            parts.Add($"{years} {(years == 1 ? "year" : "years")}");
        }

        if (months > 0)
        {
            parts.Add($"{months} {(months == 1 ? "month" : "months")}");
        }

        if (days > 0)
        {
            parts.Add($"{days} {(days == 1 ? "day" : "days")}");
        }

        return parts.Count == 0 ? "0 days" : string.Join(" ", parts);
    }

    private static string GeneratePassword(string name, string mobileNumber)
    {
        const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lower = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        const string symbols = "!@#$%^&*";
        const string allChars = upper + lower + digits + symbols;
        const int passwordLength = 10;

        var passwordChars = new char[passwordLength];

        // Guarantee at least one of each required type
        passwordChars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        passwordChars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        passwordChars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        passwordChars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

        // Fill remaining positions with random characters from all sets
        for (var i = 4; i < passwordLength; i++)
        {
            passwordChars[i] = allChars[RandomNumberGenerator.GetInt32(allChars.Length)];
        }

        // Shuffle to avoid predictable positions
        for (var i = passwordLength - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (passwordChars[i], passwordChars[j]) = (passwordChars[j], passwordChars[i]);
        }

        return new string(passwordChars);
    }

    private static string GenerateRegistrationNumber(int recordId)
    {
        var serial = recordId.ToString(CultureInfo.InvariantCulture).PadLeft(4, '0');
        var yearSuffix = (DateTime.Now.Year % 100).ToString("00", CultureInfo.InvariantCulture);
        return $"CCSU{yearSuffix}{serial}";
    }

    private static string GenerateToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string IsoNow()
    {
        return DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
    }

    private static int CalculateFee(string category)
    {
        var normalizedCategory = NormalizeText(category).ToLowerInvariant();
        return normalizedCategory is "sc" or "st" or "pwd" ? 900 : 1500;
    }

    private static string Serialize<T>(T value)
    {
        return JsonSerializer.Serialize(value, JsonDefaults.Options);
    }

    private static T DeserializeOrDefault<T>(string? json, T fallback)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return fallback;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonDefaults.Options) ?? fallback;
        }
        catch
        {
            return fallback;
        }
    }

    private static string GetPersonalFieldValue(PersonalDetailsDto personalDetails, string field)
    {
        return field switch
        {
            "name" => personalDetails.Name,
            "fatherName" => personalDetails.FatherName,
            "motherName" => personalDetails.MotherName,
            "aadhaarNumber" => personalDetails.AadhaarNumber,
            "dateOfBirth" => personalDetails.DateOfBirth,
            "mobileNumber" => personalDetails.MobileNumber,
            "emailAddress" => personalDetails.EmailAddress,
            "gender" => personalDetails.Gender,
            "category" => personalDetails.Category,
            "domicileState" => personalDetails.DomicileState,
            "addressLine1" => personalDetails.AddressLine1,
            "city" => personalDetails.City,
            "state" => personalDetails.State,
            "pinCode" => personalDetails.PinCode,
            "correspondenceAddressLine1" => personalDetails.CorrespondenceAddressLine1,
            "correspondenceAddressLine2" => personalDetails.CorrespondenceAddressLine2,
            "permanentAddressLine1" => personalDetails.PermanentAddressLine1,
            "permanentAddressLine2" => personalDetails.PermanentAddressLine2,
            _ => string.Empty,
        };
    }

    private static IEnumerable<string> BlockValues(SchoolAcademicBlockDto block)
    {
        yield return block.Board;
        yield return block.PassingYear;
        yield return block.MarksObtained;
        yield return block.MaxMarks;
    }

    private static IEnumerable<string> BlockValues(GraduationAcademicBlockDto block)
    {
        yield return block.University;
        yield return block.Course;
        yield return block.PassingYear;
        yield return block.MarksObtained;
        yield return block.MaxMarks;
    }

    private static IEnumerable<string> PostGraduateBlockValues(PostGraduationBlockDto block)
    {
        yield return block.University;
        yield return block.Course;
        yield return block.PassingYear;
        yield return block.MarksObtained;
        yield return block.MaxMarks;
    }

    private static ApiException HttpError(int statusCode, string message)
    {
        return new ApiException(statusCode, message);
    }

    private static void MapPersonalDetails(PersonalDetailsDto dto, PersonalDetailsRecord record)
    {
        record.Name = dto.Name;
        record.FatherName = dto.FatherName;
        record.MotherName = dto.MotherName;
        record.AadhaarNumber = dto.AadhaarNumber;
        record.DateOfBirth = dto.DateOfBirth;
        record.MobileNumber = dto.MobileNumber;
        record.AlternateMobileNumber = dto.AlternateMobileNumber;
        record.EmailAddress = dto.EmailAddress;
        record.Gender = dto.Gender;
        record.Nationality = dto.Nationality;
        record.Category = dto.Category;
        record.IsUpDomicile = dto.IsUpDomicile;
        record.PersonWithDisability = dto.PersonWithDisability;
        record.IsEws = dto.IsEws;
        record.DomicileCertificateNumber = dto.DomicileCertificateNumber;
        record.DomicileState = dto.DomicileState;
        
        record.CorrespondenceAddressLine1 = !string.IsNullOrWhiteSpace(dto.CorrespondenceAddressLine1) ? dto.CorrespondenceAddressLine1 : dto.CorrespondenceAddress;
        record.CorrespondenceAddressLine2 = dto.CorrespondenceAddressLine2;
        record.CorrespondenceCity = !string.IsNullOrWhiteSpace(dto.CorrespondenceCity) ? dto.CorrespondenceCity : dto.CorrespondenceDistrict;
        record.CorrespondenceState = dto.CorrespondenceState;
        record.CorrespondenceDistrict = dto.CorrespondenceDistrict;
        record.CorrespondencePinCode = dto.CorrespondencePinCode;
        
        record.PermanentAddressLine1 = !string.IsNullOrWhiteSpace(dto.PermanentAddressLine1) ? dto.PermanentAddressLine1 : dto.PermanentAddress;
        record.PermanentAddressLine2 = dto.PermanentAddressLine2;
        record.PermanentCity = !string.IsNullOrWhiteSpace(dto.PermanentCity) ? dto.PermanentCity : dto.PermanentDistrict;
        record.PermanentState = dto.PermanentState;
        record.PermanentDistrict = dto.PermanentDistrict;
        record.PermanentPinCode = dto.PermanentPinCode;
    }

    private static PersonalDetailsDto MapPersonalDetailsFromRecord(PersonalDetailsRecord? record)
    {
        if (record == null) return new PersonalDetailsDto();
        return new PersonalDetailsDto
        {
            Name = record.Name,
            FatherName = record.FatherName,
            MotherName = record.MotherName,
            AadhaarNumber = record.AadhaarNumber,
            DateOfBirth = record.DateOfBirth,
            MobileNumber = record.MobileNumber,
            AlternateMobileNumber = record.AlternateMobileNumber,
            EmailAddress = record.EmailAddress,
            Gender = record.Gender,
            Nationality = record.Nationality,
            Category = record.Category,
            IsUpDomicile = record.IsUpDomicile,
            PersonWithDisability = record.PersonWithDisability,
            IsEws = record.IsEws,
            DomicileCertificateNumber = record.DomicileCertificateNumber,
            DomicileState = record.DomicileState,
            
            CorrespondenceAddressLine1 = record.CorrespondenceAddressLine1,
            CorrespondenceAddressLine2 = record.CorrespondenceAddressLine2,
            CorrespondenceAddress = record.CorrespondenceAddressLine1,
            CorrespondenceState = record.CorrespondenceState,
            CorrespondenceDistrict = record.CorrespondenceDistrict,
            CorrespondencePinCode = record.CorrespondencePinCode,
            
            PermanentAddressLine1 = record.PermanentAddressLine1,
            PermanentAddressLine2 = record.PermanentAddressLine2,
            PermanentAddress = record.PermanentAddressLine1,
            PermanentState = record.PermanentState,
            PermanentDistrict = record.PermanentDistrict,
            PermanentPinCode = record.PermanentPinCode,
            CorrespondenceCity = record.CorrespondenceCity,
            PermanentCity = record.PermanentCity,
            
            AddressLine1 = record.PermanentAddressLine1,
            City = !string.IsNullOrWhiteSpace(record.PermanentCity) ? record.PermanentCity : record.PermanentDistrict,
            State = record.PermanentState,
            PinCode = record.PermanentPinCode
        };
    }

    private static void AddEducationRecord(ApplicantRecord applicant, string level, object block)
    {
        var record = new EducationRecord
        {
            ApplicantId = applicant.Id,
            Level = level,
            IsEnabled = true
        };

        if (block is SchoolAcademicBlockDto school)
        {
            record.BoardUniversity = school.Board;
            record.PassingYear = school.PassingYear;
            record.MarksObtained = school.MarksObtained;
            record.MaxMarks = school.MaxMarks;
        }
        else if (block is GraduationAcademicBlockDto grad)
        {
            record.BoardUniversity = grad.University;
            record.DegreeName = grad.Course;
            record.PassingYear = grad.PassingYear;
            record.MarksObtained = grad.MarksObtained;
            record.MaxMarks = grad.MaxMarks;
            record.IsEnabled = grad.Enabled;
        }
        else if (block is PostGraduationBlockDto pg)
        {
            record.BoardUniversity = pg.University;
            record.DegreeName = pg.Course;
            record.PassingYear = pg.PassingYear;
            record.MarksObtained = pg.MarksObtained;
            record.MaxMarks = pg.MaxMarks;
            record.IsEnabled = pg.Enabled;
        }

        applicant.EducationRecords.Add(record);
    }

    private static EducationDetailsDto MapEducationDetailsFromRecords(ApplicantRecord applicant)
    {
        var dto = new EducationDetailsDto();
        if (applicant.EducationRecords != null)
        {
            foreach (var rec in applicant.EducationRecords)
            {
                switch (rec.Level)
                {
                    case "HighSchool":
                        dto.HighSchool = new SchoolAcademicBlockDto { Board = rec.BoardUniversity, PassingYear = rec.PassingYear, MarksObtained = rec.MarksObtained, MaxMarks = rec.MaxMarks };
                        break;
                    case "Intermediate":
                        dto.Intermediate = new SchoolAcademicBlockDto { Board = rec.BoardUniversity, PassingYear = rec.PassingYear, MarksObtained = rec.MarksObtained, MaxMarks = rec.MaxMarks };
                        break;
                    case "Graduation":
                        dto.Graduation = new GraduationAcademicBlockDto { University = rec.BoardUniversity, Course = rec.DegreeName, PassingYear = rec.PassingYear, MarksObtained = rec.MarksObtained, MaxMarks = rec.MaxMarks, Enabled = rec.IsEnabled };
                        break;
                    case "PostGraduation":
                        dto.PostGraduation = new PostGraduationBlockDto { University = rec.BoardUniversity, Course = rec.DegreeName, PassingYear = rec.PassingYear, MarksObtained = rec.MarksObtained, MaxMarks = rec.MaxMarks, Enabled = rec.IsEnabled };
                        break;
                }
            }
        }
        dto.PreviousServiceDetails = new PreviousServiceDetailsDto
        {
            RegistrationType = (applicant.ExperienceRecords?.Count ?? 0) > 0 
                ? "Experience" 
                : (applicant.CurrentStep == "documents" || applicant.CurrentStep == "payment" || applicant.CurrentStep == "submitted" ? "Fresher" : string.Empty),
            Experiences = (applicant.ExperienceRecords ?? new List<ExperienceRecord>()).Select(e => new PreviousServiceEntryDto
            {
                OrganizationName = e.OrganizationName,
                DepartmentName = e.DepartmentName,
                Designation = e.Designation,
                NatureOfEmployment = e.NatureOfEmployment,
                DateOfJoining = e.DateOfJoining,
                DateOfRelieving = e.DateOfRelieving,
                TotalExperience = e.TotalExperience
            }).ToList()
        };
        return dto;
    }

    private sealed class ApplicantSnapshot
    {
        public int Id { get; init; }
        public string LoginId { get; init; } = string.Empty;
        public PersonalDetailsDto PersonalDetails { get; set; } = new();
        public RecruitmentDetailsDto RecruitmentDetails { get; set; } = new();
        public EducationDetailsDto EducationDetails { get; set; } = new();
        public Dictionary<string, DocumentRecordDto> Documents { get; set; } = new();
        public string PaymentStatus { get; set; } = "pending";
        public PaymentDetailsDto PaymentDetails { get; set; } = new();
        public string ApplicationStatus { get; set; } = "draft";
        public string CurrentStep { get; set; } = "personal";
        public string CreatedAt { get; init; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
        public string? SubmittedAt { get; set; }
    }
}
