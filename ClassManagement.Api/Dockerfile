# --- Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["ClassManagement.Api.csproj", "./"]
RUN dotnet restore "ClassManagement.Api.csproj"

# Copy the remaining source code and build
COPY . .
RUN dotnet publish -c Release -o /app/publish

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# අලුතින් එකතු කළ කැබැල්ල (මෙතැනින් අර වෝනිං එක මඟහරවා ගත හැක)
RUN apt-get update && apt-get install -y libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Expose port and run the application
EXPOSE 80
ENTRYPOINT ["dotnet", "ClassManagement.Api.dll"]