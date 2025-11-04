#!/bin/bash

# Railway GraphQL API Helper Script
# This script provides functions to interact with Railway's GraphQL API

RAILWAY_API_URL="https://backboard.railway.app/graphql/v2"

# Function to make GraphQL requests
railway_graphql() {
    local query="$1"
    local variables="$2"

    if [ -z "$RAILWAY_API_KEY" ]; then
        echo "Error: RAILWAY_API_KEY environment variable not set"
        exit 1
    fi

    local payload
    if [ -n "$variables" ]; then
        payload=$(jq -n --arg query "$query" --argjson variables "$variables" '{query: $query, variables: $variables}')
    else
        payload=$(jq -n --arg query "$query" '{query: $query}')
    fi

    curl -s -X POST "$RAILWAY_API_URL" \
        -H "Authorization: Bearer $RAILWAY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload"
}

# Get current user info
get_user_info() {
    local query='query { me { id name email } }'
    railway_graphql "$query"
}

# List all teams
list_teams() {
    local query='query { me { teams { edges { node { id name } } } } }'
    railway_graphql "$query"
}

# List all projects
list_projects() {
    local query='query { projects { edges { node { id name description createdAt } } } }'
    railway_graphql "$query"
}

# Create a new project
create_project() {
    local project_name="$1"
    local team_id="$2"

    local query='mutation($name: String!, $teamId: String) {
        projectCreate(input: { name: $name, teamId: $teamId }) {
            id
            name
            description
        }
    }'

    local variables
    if [ -n "$team_id" ]; then
        variables=$(jq -n --arg name "$project_name" --arg teamId "$team_id" '{name: $name, teamId: $teamId}')
    else
        variables=$(jq -n --arg name "$project_name" '{name: $name}')
    fi

    railway_graphql "$query" "$variables"
}

# Update project (rename)
update_project() {
    local project_id="$1"
    local new_name="$2"

    local query='mutation($id: String!, $name: String!) {
        projectUpdate(id: $id, input: { name: $name }) {
            id
            name
        }
    }'

    local variables=$(jq -n --arg id "$project_id" --arg name "$new_name" '{id: $id, name: $name}')

    railway_graphql "$query" "$variables"
}

# Get project details
get_project() {
    local project_id="$1"

    local query='query($id: String!) {
        project(id: $id) {
            id
            name
            description
            environments {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
            services {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    }'

    local variables=$(jq -n --arg id "$project_id" '{id: $id}')

    railway_graphql "$query" "$variables"
}

# Create environment
create_environment() {
    local project_id="$1"
    local env_name="$2"

    local query='mutation($projectId: String!, $name: String!) {
        environmentCreate(input: { projectId: $projectId, name: $name }) {
            id
            name
        }
    }'

    local variables=$(jq -n --arg projectId "$project_id" --arg name "$env_name" '{projectId: $projectId, name: $name}')

    railway_graphql "$query" "$variables"
}

# Create service from GitHub repo
create_service_from_repo() {
    local project_id="$1"
    local repo="$2"
    local service_name="$3"
    local branch="${4:-main}"

    local query='mutation($projectId: String!, $name: String, $source: ServiceSourceInput!) {
        serviceCreate(input: {
            projectId: $projectId,
            name: $name,
            source: $source
        }) {
            id
            name
        }
    }'

    local variables=$(jq -n \
        --arg projectId "$project_id" \
        --arg name "$service_name" \
        --arg repo "$repo" \
        --arg branch "$branch" \
        '{projectId: $projectId, name: $name, source: {repo: $repo, branch: $branch}}')

    railway_graphql "$query" "$variables"
}

# Deploy service (trigger deployment)
deploy_service() {
    local service_id="$1"
    local environment_id="$2"

    local query='mutation($serviceId: String!, $environmentId: String!) {
        deploymentTrigger(input: {
            serviceId: $serviceId,
            environmentId: $environmentId
        }) {
            id
            status
        }
    }'

    local variables=$(jq -n --arg serviceId "$service_id" --arg environmentId "$environment_id" '{serviceId: $serviceId, environmentId: $environmentId}')

    railway_graphql "$query" "$variables"
}

# Set environment variable
set_variable() {
    local project_id="$1"
    local environment_id="$2"
    local service_id="$3"
    local var_name="$4"
    local var_value="$5"

    local query='mutation($projectId: String!, $environmentId: String!, $serviceId: String, $name: String!, $value: String!) {
        variableUpsert(input: {
            projectId: $projectId,
            environmentId: $environmentId,
            serviceId: $serviceId,
            name: $name,
            value: $value
        }) {
            id
            name
        }
    }'

    local variables=$(jq -n \
        --arg projectId "$project_id" \
        --arg environmentId "$environment_id" \
        --arg serviceId "$service_id" \
        --arg name "$var_name" \
        --arg value "$var_value" \
        '{projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId, name: $name, value: $value}')

    railway_graphql "$query" "$variables"
}

# Get service domain
get_service_domain() {
    local service_id="$1"
    local environment_id="$2"

    local query='query($serviceId: String!, $environmentId: String!) {
        service(id: $serviceId) {
            id
            name
            deployments(environmentId: $environmentId, first: 1) {
                edges {
                    node {
                        id
                        status
                        url
                    }
                }
            }
        }
    }'

    local variables=$(jq -n --arg serviceId "$service_id" --arg environmentId "$environment_id" '{serviceId: $serviceId, environmentId: $environmentId}')

    railway_graphql "$query" "$variables"
}

# Generate public domain for service
generate_domain() {
    local service_id="$1"
    local environment_id="$2"

    local query='mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceDomainCreate(input: {
            serviceId: $serviceId,
            environmentId: $environmentId
        }) {
            domain
        }
    }'

    local variables=$(jq -n --arg serviceId "$service_id" --arg environmentId "$environment_id" '{serviceId: $serviceId, environmentId: $environmentId}')

    railway_graphql "$query" "$variables"
}

# Main command dispatcher
if [ "$#" -eq 0 ]; then
    echo "Railway API Helper Script"
    echo ""
    echo "Available functions:"
    echo "  get_user_info"
    echo "  list_teams"
    echo "  list_projects"
    echo "  create_project <name> [team_id]"
    echo "  update_project <project_id> <new_name>"
    echo "  get_project <project_id>"
    echo "  create_environment <project_id> <name>"
    echo "  create_service_from_repo <project_id> <repo> <service_name> [branch]"
    echo "  deploy_service <service_id> <environment_id>"
    echo "  set_variable <project_id> <environment_id> <service_id> <name> <value>"
    echo "  get_service_domain <service_id> <environment_id>"
    echo "  generate_domain <service_id> <environment_id>"
    exit 0
fi

# Execute function
"$@"
